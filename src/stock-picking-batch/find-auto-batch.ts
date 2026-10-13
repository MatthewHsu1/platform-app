import { CLAIM_HELD_MESSAGE, claimKey, heldClaimKeys, withClaim } from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { confirmBatch } from 'src/stock-picking-batch/confirm-batch';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import {
  stockMoves,
  stockPickingBatches,
  stockPickings,
  stockPickingTypes,
} from 'src/stock-picking-batch/stock-picking-batch-records';
import { type AutoBatchPicking } from 'src/stock-picking-batch/types/auto-batch-picking.type';
import { type AutoBatchType } from 'src/stock-picking-batch/types/auto-batch-type.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type TransferForGroups } from 'src/stock-picking-batch/types/transfer-for-groups.type';
import { closedBatchIds } from 'src/stock-picking-batch/utils/closed-batch-ids.util';
import { planFindAutoBatch } from 'src/stock-picking-batch/utils/plan-find-auto-batch.util';
import { TRANSFER_GROUP_SELECTION, transferGroupValues } from 'src/stock-picking-batch/utils/transfer-partner.util';
import { PICKING_STATE } from 'src/stock/stock-options.constant';

type TransferRow = TransferForGroups & {
  id: string;
  state: string;
  personId: string | null;
  companyId: string | null;
  pickingTypeId: string | null;
  batchId: string | null;
  responsibleUserId: string | null;
  priority: string;
  scheduledDate: string | null;
  createdAt: string;
  backorderId: string | null;
};
type BatchRow = { id: string; name: string | null; state: BatchState; isWave: boolean; pickingTypeId: string | null };

const TRANSFER_SELECTION = `id state personId companyId pickingTypeId batchId responsibleUserId priority scheduledDate createdAt backorderId ${TRANSFER_GROUP_SELECTION}`;
const TYPE_SELECTION =
  'autoBatch batchGroupByPartner batchGroupByDestination batchGroupBySrcLoc batchGroupByDestLoc batchMaxLines batchMaxPickings batchAutoConfirm';
const LOCK_ATTEMPTS = 10;
const LOCK_WAIT_STEP_MS = 500;

const readTransfer = async (pickingId: string) =>
  (await stockPickings.find<TransferRow>({ id: { eq: pickingId } }, TRANSFER_SELECTION))[0];

const readType = async (pickingTypeId: string) =>
  (await stockPickingTypes.find<AutoBatchType>({ id: { eq: pickingTypeId } }, TYPE_SELECTION))[0];

const moveCounts = async (pickingIds: string[]) => {
  const moves = await stockMoves.find<{ pickingId: string }>({ pickingId: { in: [...new Set(pickingIds)] } }, 'pickingId');
  const counts = new Map<string, number>();

  moves.forEach((move) => counts.set(move.pickingId, (counts.get(move.pickingId) ?? 0) + 1));
  return counts;
};

const toPlanned = (row: TransferRow & { pickingTypeId: string }, counts: Map<string, number>): AutoBatchPicking => ({
  id: row.id,
  state: row.state,
  pickingTypeId: row.pickingTypeId,
  batchId: row.batchId,
  responsibleUserId: row.responsibleUserId,
  priority: row.priority,
  scheduledDate: row.scheduledDate,
  createdAt: row.createdAt,
  moveCount: counts.get(row.id) ?? 0,
  ...transferGroupValues(row),
});

const sameOrNone = (value: string | null) => (value === null ? { is: 'NULL' } : { eq: value });

// The contact is the person when set, else the company.
const partnerFilter = (row: TransferRow) =>
  row.personId !== null
    ? { personId: { eq: row.personId } }
    : { personId: { is: 'NULL' }, companyId: sameOrNone(row.companyId) };

// One filter per active group value Twenty can filter on; the contact's
// country sits on another record, so it is matched after the read only.
const groupFilters = (type: AutoBatchType, row: TransferRow) => [
  ...(type.batchGroupByPartner ? [partnerFilter(row)] : []),
  ...(type.batchGroupBySrcLoc ? [{ locationId: sameOrNone(row.locationId) }] : []),
  ...(type.batchGroupByDestLoc ? [{ locationDestId: sameOrNone(row.locationDestId) }] : []),
];

// Only batches where every filterable group value is held by one of their
// transfers can take the transfer; their transfers are all read, for the limits.
const readCandidateMembers = async (batchIds: string[], filters: Record<string, unknown>[]) => {
  let candidates = batchIds;

  for (const filter of filters) {
    const matching = await stockPickings.find<{ batchId: string }>({ and: [{ batchId: { in: candidates } }, filter] }, 'batchId');
    const held = new Set(matching.map((member) => member.batchId));

    candidates = candidates.filter((batchId) => held.has(batchId));
  }
  return stockPickings.find<TransferRow>({ batchId: { in: candidates } }, TRANSFER_SELECTION);
};

// The batch a run made for this save, when there is one. It can still be used
// only while it is an empty draft; otherwise this save has had its batch.
const readSaveBatch = async (batchId: string) => {
  const [batch] = await stockPickingBatches.findIncludingDeleted<{ state: BatchState; deletedAt: string | null }>(
    { id: { eq: batchId } },
    'state deletedAt',
  );

  if (batch === undefined) {
    return 'none';
  }
  const pickings = await stockPickings.find<{ id: string }>({ batchId: { eq: batchId } }, 'id');

  return batch.deletedAt === null && batch.state === BATCH_STATE.DRAFT && pickings.length === 0 ? 'empty draft' : 'spent';
};

// Two transfers of one type that get ready together would each pair with the
// other in a batch of its own, so one run at a time per operation type; a run
// that finds the type busy waits a little longer each time.
const oneRunPerType = async (pickingTypeId: string, run: () => Promise<void>) => {
  for (let attempt = 1; ; attempt += 1) {
    if ((await withClaim(claimKey('autoBatch', pickingTypeId), run)).kind === 'done') {
      return;
    }
    if (attempt >= LOCK_ATTEMPTS) {
      throw new Error(CLAIM_HELD_MESSAGE);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * LOCK_WAIT_STEP_MS));
  }
};

const runFindAutoBatch = async (pickingId: string, pickingTypeId: string, newBatchId: string, batchesToValidate: string[]) => {
  const row = await readTransfer(pickingId);

  if (row === undefined || row.pickingTypeId !== pickingTypeId) {
    return;
  }
  const type = await readType(pickingTypeId);

  if (type === undefined || !type.autoBatch) {
    return;
  }
  // The batch a stopped run made for this save already holds the transfer:
  // only its confirm may be left.
  if (row.batchId === newBatchId) {
    const [batch] = await stockPickingBatches.find<{ state: BatchState }>({ id: { eq: newBatchId } }, 'state');

    if (type.batchAutoConfirm && batch?.state === BATCH_STATE.DRAFT) {
      await confirmBatch(newBatchId);
    }
    return;
  }
  const batches = await stockPickingBatches.find<BatchRow>(
    {
      pickingTypeId: { eq: pickingTypeId },
      isWave: { eq: false },
      state: { in: [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS] },
    },
    'id name state isWave pickingTypeId',
  );
  // A batch whose Validate is running takes no transfer, also when the call
  // comes from a trigger that cannot know which batches are being validated;
  // a backorder never joins the batch its original is still in.
  const validating = new Set(await heldClaimKeys(batches.map((batch) => claimKey('batchValidate', batch.id))));
  const original = row.backorderId === null ? undefined : await readTransfer(row.backorderId);
  const excludedBatchIds = [
    ...batchesToValidate,
    ...closedBatchIds({
      validatingBatchIds: batches.filter((batch) => validating.has(claimKey('batchValidate', batch.id))).map((batch) => batch.id),
      originalBatchId: original?.batchId ?? null,
    }),
  ];
  const filters = groupFilters(type, row);
  const members = await readCandidateMembers(
    batches.map((batch) => batch.id),
    filters,
  );
  const others = await stockPickings.find<TransferRow & { pickingTypeId: string }>(
    {
      and: [
        { pickingTypeId: { eq: pickingTypeId }, state: { eq: PICKING_STATE.ASSIGNED }, batchId: { is: 'NULL' } },
        ...filters,
      ],
    },
    TRANSFER_SELECTION,
  );
  const counts = await moveCounts([row.id, ...members.map((member) => member.id), ...others.map((other) => other.id)]);
  const plan = planFindAutoBatch({
    picking: toPlanned({ ...row, pickingTypeId }, counts),
    type,
    openBatches: batches.flatMap((batch) => {
      const own = members.filter((member) => member.batchId === batch.id);

      return own.length === 0
        ? []
        : [
            {
              ...batch,
              name: batch.name ?? '',
              moveCount: own.reduce((sum, member) => sum + (counts.get(member.id) ?? 0), 0),
              pickings: own.map(transferGroupValues),
            },
          ];
    }),
    otherPickings: others.map((other) => toPlanned(other, counts)),
    batchesToValidate: excludedBatchIds,
  });

  if (plan.kind === 'skip') {
    return;
  }
  const saveBatch = await readSaveBatch(newBatchId);

  if (plan.kind === 'join') {
    await stockPickings.update(row.id, { batchId: plan.batchId });

    if (saveBatch === 'empty draft') {
      await stockPickingBatches.destroyMany([newBatchId]);
    }
    return;
  }
  if (saveBatch === 'spent') {
    return;
  }
  const data = { pickingTypeId, description: plan.description, responsibleId: plan.responsibleId, isWave: false };

  // The batch trigger names the batch from its type.
  if (saveBatch === 'empty draft') {
    await stockPickingBatches.update(newBatchId, { description: plan.description, responsibleId: plan.responsibleId });
  } else {
    await createMissingRows(stockPickingBatches, [{ id: newBatchId, data }]);
  }
  await stockPickings.updateMany(plan.pickingIds, { batchId: newBatchId });

  if (plan.confirm) {
    await confirmBatch(newBatchId);
  }
};

// Puts a ready transfer into an open batch of its type that shares its group
// values, else into a new batch with a matching ready transfer, else into a new
// batch of its own. `saveKey` names the save that made the transfer ready, so
// a rerun for that save finds the batch it made.
export const findAutoBatch = async (pickingId: string, options: { saveKey: string; batchesToValidate?: string[] }) => {
  const row = await readTransfer(pickingId);
  const newBatchId = derivedId('autoBatch', pickingId, options.saveKey);

  if (
    row === undefined ||
    row.pickingTypeId === null ||
    row.state !== PICKING_STATE.ASSIGNED ||
    (row.batchId !== null && row.batchId !== newBatchId)
  ) {
    return;
  }
  const pickingTypeId = row.pickingTypeId;

  // A type that does not batch automatically never waits for the per-type lock;
  // the run reads the type again under it.
  if ((await readType(pickingTypeId))?.autoBatch !== true) {
    return;
  }
  await oneRunPerType(pickingTypeId, () =>
    runFindAutoBatch(pickingId, pickingTypeId, newBatchId, options.batchesToValidate ?? []),
  );
};
