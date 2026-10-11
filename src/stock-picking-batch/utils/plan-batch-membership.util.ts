import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type BatchForCheck } from 'src/stock-picking-batch/types/batch-for-check.type';
import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';
import { PICKING_STATE } from 'src/stock/stock-options.constant';

type MembershipChange = {
  pickingId: string;
  batchId: string | null;
  previousBatchId: string | null;
  // Staff saves are checked; the app's flows check before they write.
  checked: boolean;
};

// A batch as read after the saves, with the transfers it holds now.
type MembershipBatch = BatchForCheck & { id: string; members: PickingForCheck[] };

// A moved transfer as read after the saves.
type MovedPicking = PickingForCheck & { batchId: string | null };

type Refusal = { pickingId: string; previousBatchId: string | null; batchName: string; transfers: string[] };

// Transfers moved into, out of or between batches. A transfer the batch may
// not hold goes back; so does one joining a batch that already holds a
// transfer it may not hold, since the whole batch must stay allowed. An
// untyped batch takes the type of its first transfer. A batch in progress
// left with no transfers is cancelled; one emptied by moving its transfers
// to another batch is cancelled unless it is done.
//
// The app putting a refused transfer back looks like a move out of the batch
// that refused it. It is told apart by the transfer not being allowed in that
// batch, and it changes nothing there: no cancel, and the batch it returns to
// does not hand out its responsible again.
export const planBatchMembership = ({
  changes,
  batches,
  pickings,
}: {
  changes: MembershipChange[];
  batches: MembershipBatch[];
  pickings: MovedPicking[];
}) => {
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const isPutBack = (change: MembershipChange) => {
    const left = change.previousBatchId === null ? undefined : batchById.get(change.previousBatchId);
    const picking = pickingById.get(change.pickingId);

    return !change.checked && left !== undefined && picking !== undefined && incompatiblePickings(left, [picking]).length > 0;
  };
  const typeOf = new Map(batches.map((batch) => [batch.id, batch.pickingTypeId]));
  const joiningIds = new Set(changes.filter((change) => change.batchId !== null).map((change) => change.pickingId));
  const refusals: Refusal[] = [];
  const accepted: { pickingId: string; batchId: string; putBack: boolean }[] = [];
  const setTypes = new Map<string, string>();

  for (const change of changes) {
    const batch = change.batchId === null ? undefined : batchById.get(change.batchId);
    const picking = batch?.members.find((member) => member.id === change.pickingId);

    // The transfer has moved on since this save: the later save's event decides.
    if (batch === undefined || picking === undefined) {
      continue;
    }
    const batchTypeId = typeOf.get(batch.id) ?? null;
    const pickingTypeId = batchTypeId ?? picking.pickingTypeId;
    const typesBatch = batchTypeId === null && pickingTypeId !== null;

    if (change.checked || typesBatch) {
      const others = batch.members.filter((member) => !joiningIds.has(member.id));
      const refused = incompatiblePickings({ ...batch, pickingTypeId }, [...others, picking]);

      if (refused.length > 0) {
        refusals.push({ pickingId: picking.id, previousBatchId: change.previousBatchId, batchName: batch.name, transfers: refused });
        continue;
      }
    }
    if (typesBatch) {
      typeOf.set(batch.id, pickingTypeId);
      setTypes.set(batch.id, pickingTypeId);
    }
    accepted.push({ pickingId: picking.id, batchId: batch.id, putBack: isPutBack(change) });
  }

  const refusedIds = new Set(refusals.map((refusal) => refusal.pickingId));
  const movedToBatch = new Map<string, boolean>();

  for (const change of changes) {
    if (change.previousBatchId !== null && change.previousBatchId !== change.batchId && !isPutBack(change)) {
      const moved = change.batchId !== null && !refusedIds.has(change.pickingId);

      movedToBatch.set(change.previousBatchId, (movedToBatch.get(change.previousBatchId) ?? false) || moved);
    }
  }
  const cancelBatchIds = [...movedToBatch].flatMap(([batchId, moved]) => {
    const batch = batchById.get(batchId);
    const comingBack = refusals.filter((refusal) => refusal.previousBatchId === batchId).length;

    if (batch === undefined || batch.members.length + comingBack > 0) {
      return [];
    }
    const cancels = batch.state === BATCH_STATE.IN_PROGRESS || (moved && batch.state === BATCH_STATE.DRAFT);

    return cancels ? [batchId] : [];
  });

  return {
    refusals,
    accepted,
    setTypes: [...setTypes].map(([batchId, pickingTypeId]) => ({ batchId, pickingTypeId })),
    cancelBatchIds,
    touchedBatchIds: [
      ...new Set([
        ...accepted.map((entry) => entry.batchId),
        ...[...movedToBatch.keys()].filter((batchId) => batchById.has(batchId)),
      ]),
    ],
  };
};

// A batch being validated neither takes nor gives up a transfer until its
// Validate ends, so a staff edit moving a transfer into or out of one goes
// back whole. The app's own flows check this before they write.
export const isEditOfValidatingBatch = (change: MembershipChange, validatingBatchIds: ReadonlySet<string>) =>
  change.checked && [change.batchId, change.previousBatchId].some((id) => id !== null && validatingBatchIds.has(id));

// A cancelled transfer leaves its batch while the batch still has transfers
// that are not cancelled; in an all-cancelled batch it stays.
export const pickingsLeavingOnCancel = ({
  cancelled,
  batchStates,
}: {
  cancelled: { id: string; batchId: string }[];
  batchStates: ReadonlyMap<string, string[]>;
}) =>
  cancelled
    .filter((picking) => (batchStates.get(picking.batchId) ?? []).some((state) => state !== PICKING_STATE.CANCEL))
    .map((picking) => picking.id);
