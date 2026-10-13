import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches, stockPickings, stockPickingTypes } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { planBatchCounts, planBatchScheduledDate, planBatchState } from 'src/stock-picking-batch/utils/plan-batch-state.util';
import { sameValue } from 'src/shared/utils/same-value.util';

type BatchStateRow = { id: string; state: BatchState; scheduledDate: string | null };
type BatchCountRow = { pickingTypeId: string | null; isWave: boolean; state: BatchState };

// The one writer of a batch's state and scheduled date from its transfers.
// Every state it writes comes back through the batch trigger, which keeps the
// open batch and wave counts of the operation type.
export const recomputeBatchState = async (batchIds: string[]) => {
  const ids = [...new Set(batchIds)];

  if (ids.length === 0) {
    return;
  }
  const batches = await stockPickingBatches.find<BatchStateRow>({ id: { in: ids } }, 'id state scheduledDate');
  const pickings = await stockPickings.find<{ batchId: string; state: string; scheduledDate: string | null }>(
    { batchId: { in: ids } },
    'batchId state scheduledDate',
  );

  for (const batch of batches) {
    const own = pickings.filter((picking) => picking.batchId === batch.id);
    const state = planBatchState({ state: batch.state, pickingStates: own.map((picking) => picking.state) });
    const scheduledDate = planBatchScheduledDate(own.map((picking) => picking.scheduledDate));
    const data: Record<string, unknown> = {};

    if (state !== batch.state) {
      data.state = state;
    }
    if (!sameValue(scheduledDate, batch.scheduledDate)) {
      data.scheduledDate = scheduledDate;
    }
    await stockPickingBatches.update(batch.id, data);
  }
};

// The open batches and waves of each operation type.
export const recomputeBatchCounts = async (pickingTypeIds: string[]) => {
  const typeIds = [...new Set(pickingTypeIds)];

  if (typeIds.length === 0) {
    return;
  }
  const openBatches = await stockPickingBatches.find<BatchCountRow>(
    { pickingTypeId: { in: typeIds }, state: { in: [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS] } },
    'state pickingTypeId isWave',
  );
  const counts = planBatchCounts(openBatches);
  const types = await stockPickingTypes.find<{ id: string; countPickingBatch: number | null; countPickingWave: number | null }>(
    { id: { in: typeIds } },
    'id countPickingBatch countPickingWave',
  );

  for (const type of types) {
    const count = counts.get(type.id) ?? { countPickingBatch: 0, countPickingWave: 0 };
    const data: Record<string, unknown> = {};

    if (type.countPickingBatch !== count.countPickingBatch) {
      data.countPickingBatch = count.countPickingBatch;
    }
    if (type.countPickingWave !== count.countPickingWave) {
      data.countPickingWave = count.countPickingWave;
    }
    await stockPickingTypes.update(type.id, data);
  }
};
