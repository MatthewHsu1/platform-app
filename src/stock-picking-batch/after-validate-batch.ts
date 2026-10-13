import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { autoWave } from 'src/stock-picking-batch/auto-wave';
import { findAutoBatch } from 'src/stock-picking-batch/find-auto-batch';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { planAfterValidateBatch } from 'src/stock-picking-batch/utils/plan-batch-validate.util';

type PickingRow = { id: string; state: string; batchId: string | null };

type AfterValidateBatchStore = {
  readPickings: (ids: string[]) => Promise<PickingRow[]>;
  readBackorders: (originalIds: string[]) => Promise<{ id: string; backorderId: string }[]>;
  readMembers: (batchIds: string[]) => Promise<{ id: string; state: string; batchId: string }[]>;
  clearBatch: (pickingIds: string[]) => Promise<void>;
  unpickEmptyMoves: (pickingIds: string[]) => Promise<void>;
  findAutoBatch: (pickingId: string, options: { saveKey: string; batchesToValidate?: string[] }) => Promise<void>;
  autoWave: (pickingIds: string[], batchesToValidate: string[]) => Promise<void>;
  recomputeBatchState: (batchIds: string[]) => Promise<void>;
};

const batchIdsOf = (rows: { batchId: string | null }[]) => [
  ...new Set(rows.flatMap((row) => (row.batchId === null ? [] : [row.batchId]))),
];

// Validate calls this at its end, and a resume calls it again with what the
// stopped click asked: each write is planned from the rows as they are now, so
// a second run finds nothing left to do.
export const makeAfterValidateBatch =
  (store: AfterValidateBatchStore) =>
  async ({
    pickingIds,
    batchesToValidate,
    pickingsToDetach,
  }: {
    pickingIds: string[];
    batchesToValidate: string[];
    pickingsToDetach: string[];
  }): Promise<void> => {
    const validated = await store.readPickings(pickingIds);
    const backorders = await store.readBackorders(pickingIds);
    const detached = await store.readPickings(pickingsToDetach);
    const batchIds = batchIdsOf([...validated, ...detached]);
    const batchMemberStates = new Map<string, { id: string; state: string }[]>();

    for (const member of await store.readMembers(batchIds)) {
      batchMemberStates.set(member.batchId, [...(batchMemberStates.get(member.batchId) ?? []), member]);
    }
    const plan = planAfterValidateBatch({
      validated: validated.map((picking) => ({
        ...picking,
        backorderIds: backorders.filter((backorder) => backorder.backorderId === picking.id).map((backorder) => backorder.id),
      })),
      detached,
      batchesToValidate,
      batchMemberStates,
    });

    if (plan.stop) {
      return;
    }
    if (plan.detachIds.length > 0) {
      await store.clearBatch(plan.detachIds);
    }
    if (plan.unpickIds.length > 0) {
      await store.unpickEmptyMoves(plan.unpickIds);
    }
    if (plan.leaveIds.length > 0) {
      await store.clearBatch(plan.leaveIds);
    }
    // A batch whose transfers are now all done must read as done before the
    // new backorders look for an open batch.
    await store.recomputeBatchState(batchIds);

    // One transfer that cannot get its batch must not keep the others from theirs.
    const errors = errorCollector();

    for (const pickingId of plan.rebatchIds) {
      await errors.run(`auto batch ${pickingId}`, () =>
        store.findAutoBatch(pickingId, { saveKey: ['afterValidate', ...batchesToValidate, pickingId].join(':'), batchesToValidate }),
      );
    }
    await errors.run('auto wave', () => store.autoWave(plan.rebatchIds, batchesToValidate));
    await store.recomputeBatchState(batchIds);
    errors.throwIfAny();
  };

export const afterValidateBatch = makeAfterValidateBatch({
  readPickings: (ids) => stockPickings.find<PickingRow>({ id: { in: ids } }, 'id state batchId'),
  readBackorders: (originalIds) =>
    stockPickings.find<{ id: string; backorderId: string }>({ backorderId: { in: originalIds } }, 'id backorderId'),
  readMembers: (batchIds) => stockPickings.find<{ id: string; state: string; batchId: string }>({ batchId: { in: batchIds } }, 'id state batchId'),
  clearBatch: (pickingIds) => stockPickings.updateMany(pickingIds, { batchId: null }),
  // A move with no quantity has no line to unpick: only its own flag goes.
  unpickEmptyMoves: async (pickingIds) => {
    const moves = await stockMoves.find<{ id: string; quantity: number | null }>(
      { pickingId: { in: pickingIds }, picked: { eq: true } },
      'id quantity',
    );

    await stockMoves.updateMany(
      moves.filter((move) => !move.quantity).map((move) => move.id),
      { picked: false },
    );
  },
  findAutoBatch,
  autoWave: async (pickingIds, batchesToValidate) => {
    const lines = await stockMoveLines.find<{ id: string }>({ pickingId: { in: pickingIds } }, 'id');

    await autoWave(
      lines.map((line) => line.id),
      { skipWaveableCheck: true, batchesToValidate },
    );
  },
  recomputeBatchState,
});
