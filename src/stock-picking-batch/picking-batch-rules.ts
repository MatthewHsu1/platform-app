import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { assignBatchResponsible } from 'src/stock-picking-batch/assign-batch-responsible';
import { findAutoBatch } from 'src/stock-picking-batch/find-auto-batch';
import { numberBatch } from 'src/stock-picking-batch/number-batch';
import { waitForBatchNumber } from 'src/stock-picking-batch/read-batch-name';
import { validatingBatchIds } from 'src/stock-picking-batch/validating-batches';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { isDefaultBatchName } from 'src/stock-picking-batch/utils/plan-batch-naming.util';
import {
  isEditOfValidatingBatch,
  pickingsLeavingOnCancel,
  planBatchMembership,
} from 'src/stock-picking-batch/utils/plan-batch-membership.util';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';

type PickingBatchEventRecord = PickingEventRecord & { batchId?: string | null; updatedAt?: string };
type PickingEvent = ObjectRecordEvent<PickingEventRecord>;
type MemberRow = { id: string; name: string | null; state: string; pickingTypeId: string | null; batchId: string };
type BatchRecord = {
  id: string;
  name: string | null;
  state: BatchState;
  isWave: boolean;
  pickingTypeId: string | null;
  responsibleId: string | null;
};

const PICKING_OBJECT = { objectSingular: 'stockPicking', objectPlural: 'stockPickings' } as const;

const readMembers = async (batchIds: string[]) =>
  batchIds.length === 0
    ? []
    : stockPickings.find<MemberRow>({ batchId: { in: batchIds } }, 'id name state pickingTypeId batchId');

const afterOf = (event: PickingEvent) => eventAfter(event) as PickingBatchEventRecord | undefined;

// The save an event records; notes and numbers made for it take their ids from it.
const saveKeyOf = (event: PickingEvent) => {
  const updatedAt = afterOf(event)?.updatedAt;

  if (updatedAt === undefined || updatedAt === '') {
    throw new Error(`The transfer event ${event.recordId} has no updatedAt`);
  }
  return updatedAt;
};

// A transfer moved into, out of or between batches: refused joins go back,
// an untyped batch takes the transfer's type, the batch responsible goes to
// its transfers, an emptied batch may be cancelled. Returns the batches whose
// state and date depend on the moved transfers.
const handleMembership = async (events: PickingEvent[], operation: RecordOperation, errors: ErrorCollector) => {
  let moves = events.flatMap((event) => {
    const after = afterOf(event);

    if (after === undefined || after.batchId === undefined) {
      return [];
    }
    const batchId = after.batchId;
    const previousBatchId =
      operation === 'created' ? null : ((eventBefore(event) as PickingBatchEventRecord | undefined)?.batchId ?? null);

    return batchId === previousBatchId
      ? []
      : [{ event, change: { pickingId: event.recordId, batchId, previousBatchId, checked: isStaffEvent(operation, event) } }];
  });

  const allBatchIds = [
    ...new Set(moves.flatMap(({ change }) => [change.batchId, change.previousBatchId].filter((id): id is string => id !== null))),
  ];
  const validating = new Set(allBatchIds.length === 0 ? [] : await validatingBatchIds(allBatchIds));
  const held = moves.filter(({ change }) => isEditOfValidatingBatch(change, validating));

  for (const move of held) {
    await errors.run(move.change.pickingId, () =>
      putBackForEvent({ ...PICKING_OBJECT, event: move.event, data: { batchId: move.change.previousBatchId }, message: CLAIM_HELD_MESSAGE }),
    );
  }
  moves = moves.filter((move) => !held.includes(move));

  if (moves.length === 0) {
    return [];
  }
  const batchIds = [
    ...new Set(moves.flatMap(({ change }) => [change.batchId, change.previousBatchId].filter((id): id is string => id !== null))),
  ];
  const batches = await stockPickingBatches.find<BatchRecord>(
    { id: { in: batchIds } },
    'id name state isWave pickingTypeId responsibleId',
  );
  const members = await readMembers(batchIds);
  const pickings = await stockPickings.find<Omit<MemberRow, 'batchId'> & { batchId: string | null }>(
    { id: { in: moves.map(({ change }) => change.pickingId) } },
    'id name state pickingTypeId batchId',
  );
  const plan = planBatchMembership({
    changes: moves.map(({ change }) => change),
    pickings: pickings.map((picking) => ({ ...picking, name: picking.name ?? '' })),
    batches: batches.map((batch) => ({
      id: batch.id,
      name: batch.name ?? '',
      state: batch.state,
      pickingTypeId: batch.pickingTypeId,
      members: members
        .filter((member) => member.batchId === batch.id)
        .map((member) => ({ id: member.id, name: member.name ?? '', state: member.state, pickingTypeId: member.pickingTypeId })),
    })),
  });

  for (const refusal of plan.refusals) {
    const move = moves.find(({ change }) => change.pickingId === refusal.pickingId);

    if (move !== undefined) {
      await errors.run(refusal.pickingId, () =>
        putBackForEvent({
          ...PICKING_OBJECT,
          event: move.event,
          data: { batchId: refusal.previousBatchId },
          message: BATCH_MESSAGES.incompatible,
          values: { batch: refusal.batchName, transfers: refusal.transfers.join(', ') },
        }),
      );
    }
  }
  await errors.run('emptied batches', () => stockPickingBatches.updateMany(plan.cancelBatchIds, { state: BATCH_STATE.CANCEL }));

  for (const batch of batches) {
    const joins = moves.filter(({ change }) =>
      plan.accepted.some((entry) => entry.pickingId === change.pickingId && entry.batchId === batch.id),
    );

    if (joins.length > 0) {
      await errors.run(batch.id, () =>
        settleJoinedBatch(batch, {
          joins: joins.map(({ event, change }) => ({
            event,
            putBack: plan.accepted.some((entry) => entry.pickingId === change.pickingId && entry.putBack),
          })),
          typeId: plan.setTypes.find((entry) => entry.batchId === batch.id)?.pickingTypeId ?? null,
          operation,
        }),
      );
    }
  }
  return plan.touchedBatchIds;
};

// A batch transfers joined: an untyped one takes the type and its number in
// one write, so the batch trigger does not number it again; then, when the
// join was an edit and not a put-back, the batch responsible goes to all its
// transfers. For a typed batch still named "New" the copy waits a little for
// the number the batch trigger gives it; one that gets none (staff named it
// "New") is copied with that name.
const settleJoinedBatch = async (
  batch: BatchRecord,
  {
    joins,
    typeId,
    operation,
  }: { joins: { event: PickingEvent; putBack: boolean }[]; typeId: string | null; operation: RecordOperation },
) => {
  const latest = joins
    .map((join) => ({ ...join, saveKey: saveKeyOf(join.event) }))
    .sort((left, right) => right.saveKey.localeCompare(left.saveKey))[0];
  const locale = await readMemberLocale(latest.event.workspaceMemberId);
  let name = batch.name;

  if (typeId !== null) {
    name = await numberBatch(batch.id, {
      pickingTypeId: typeId,
      // Another transfer trigger may have typed and numbered it meanwhile.
      needsNumber: (current) => current.pickingTypeId === null,
      misconfiguredNote: { id: derivedId('batchMisconfigured', batch.id, latest.saveKey), locale },
    });
  }
  // A transfer created in a batch keeps its own responsible.
  const edits = joins.filter((join) => !join.putBack);

  if (operation !== 'updated' || edits.length === 0) {
    return;
  }
  // The batch trigger's copy for a new batch only reaches transfers made
  // before the batch, so a transfer made later and moved in before the number
  // came gets it here, once the number is there to name the batch.
  if (typeId === null && batch.pickingTypeId !== null && isDefaultBatchName(batch.name)) {
    name = (await waitForBatchNumber(batch.id)).name;
  }
  const lastEdit = edits
    .map((join) => ({ ...join, saveKey: saveKeyOf(join.event) }))
    .sort((left, right) => right.saveKey.localeCompare(left.saveKey))[0];

  await assignBatchResponsible(
    { id: batch.id, name: name ?? '', responsibleId: batch.responsibleId },
    {
      saveKey: lastEdit.saveKey,
      locale: await readMemberLocale(lastEdit.event.workspaceMemberId),
      createdBefore: lastEdit.saveKey,
    },
  );
};

// A cancelled transfer leaves a batch that still has live transfers, so the
// batch can still be finished; in an all-cancelled batch it stays.
const handleCancelled = async (events: PickingEvent[], operation: RecordOperation) => {
  if (operation !== 'updated') {
    return;
  }
  const cancelled = events.flatMap((event) => {
    const after = afterOf(event);

    return after !== undefined &&
      after.state === PICKING_STATE.CANCEL &&
      typeof after.batchId === 'string' &&
      eventChangedFields(event, ['state']).length > 0
      ? [{ id: event.recordId, batchId: after.batchId }]
      : [];
  });

  if (cancelled.length === 0) {
    return;
  }
  const members = await readMembers([...new Set(cancelled.map((picking) => picking.batchId))]);
  const current = cancelled.filter((picking) =>
    members.some((member) => member.id === picking.id && member.batchId === picking.batchId && member.state === PICKING_STATE.CANCEL),
  );
  const batchStates = new Map<string, string[]>();

  for (const member of members) {
    batchStates.set(member.batchId, [...(batchStates.get(member.batchId) ?? []), member.state]);
  }
  await stockPickings.updateMany(pickingsLeavingOnCancel({ cancelled: current, batchStates }), { batchId: null });
};

// A transfer that becomes ready, or is created ready, looks for a batch when
// its operation type batches automatically.
const handleReady = async (events: PickingEvent[], operation: RecordOperation, errors: ErrorCollector) => {
  for (const event of events) {
    const after = afterOf(event);
    const ready =
      after?.state === PICKING_STATE.ASSIGNED &&
      (operation === 'created' || eventChangedFields(event, ['state']).length > 0);

    if (ready) {
      await errors.run(`auto batch ${event.recordId}`, () =>
        findAutoBatch(event.recordId, { saveKey: saveKeyOf(event) }),
      );
    }
  }
};

// The batch rules of transfers, run last by the transfer trigger. They run for
// the app's writes too: the flows write transfer states and batches as the app.
export const handlePickingBatchRules = async (
  events: PickingEvent[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  const toRecompute = new Set<string>();

  await errors.run('batch membership', async () => {
    (await handleMembership(events, operation, errors)).forEach((batchId) => toRecompute.add(batchId));
  });
  await errors.run('cancelled transfers', () => handleCancelled(events, operation));

  // A member's state or date moves the batch state and date.
  if (operation === 'updated') {
    for (const event of events) {
      const batchId = afterOf(event)?.batchId;

      if (typeof batchId === 'string' && eventChangedFields(event, ['state', 'scheduledDate']).length > 0) {
        toRecompute.add(batchId);
      }
    }
  }
  if (toRecompute.size > 0) {
    await errors.run('batch state', () => recomputeBatchState([...toRecompute]));
  }
  await handleReady(events, operation, errors);
};
