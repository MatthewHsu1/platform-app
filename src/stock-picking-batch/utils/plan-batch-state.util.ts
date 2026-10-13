import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { PICKING_STATE } from 'src/stock/stock-options.constant';

// A batch only moves forward on its own: a done or cancelled batch stays so.
export const planBatchState = ({ state, pickingStates }: { state: BatchState; pickingStates: string[] }): BatchState => {
  if (state === BATCH_STATE.CANCEL || state === BATCH_STATE.DONE || pickingStates.length === 0) {
    return state;
  }
  if (pickingStates.every((pickingState) => pickingState === PICKING_STATE.CANCEL)) {
    return BATCH_STATE.CANCEL;
  }
  if (pickingStates.every((pickingState) => pickingState === PICKING_STATE.CANCEL || pickingState === PICKING_STATE.DONE)) {
    return BATCH_STATE.DONE;
  }
  return state;
};

export const planBatchScheduledDate = (pickingDates: (string | null)[]) =>
  pickingDates.filter((date): date is string => date !== null).sort()[0] ?? null;

const OPEN_STATES = new Set<BatchState>([BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS]);

export const planBatchCounts = (batches: { pickingTypeId: string | null; isWave: boolean; state: BatchState }[]) => {
  const counts = new Map<string, { countPickingBatch: number; countPickingWave: number }>();

  for (const batch of batches) {
    if (batch.pickingTypeId === null) {
      continue;
    }
    const count = counts.get(batch.pickingTypeId) ?? { countPickingBatch: 0, countPickingWave: 0 };

    if (OPEN_STATES.has(batch.state)) {
      if (batch.isWave) {
        count.countPickingWave += 1;
      } else {
        count.countPickingBatch += 1;
      }
    }
    counts.set(batch.pickingTypeId, count);
  }
  return counts;
};
