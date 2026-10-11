import { confirmBatch } from 'src/stock-picking-batch/confirm-batch';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockMoveLines, stockMoves, stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { planBatchCancel, planBatchCheckAvailability, planBatchConfirm } from 'src/stock-picking-batch/utils/plan-batch-buttons.util';
import { assignPickings } from 'src/stock/picking/actions/assign-pickings';
import { unreservePickings } from 'src/stock/picking/actions/unreserve-pickings';
import { filterReadableIds } from 'src/stock/stock-access';
import { holdTransfers } from 'src/stock/reports/reception/allocation-holds';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { NOTHING_TO_PACK } from 'src/stock/utils/plan-put-in-pack.util';

const readBatch = async (batchId: string) => {
  const [batch] = await stockPickingBatches.find<{ id: string; state: BatchState }>({ id: { eq: batchId } }, 'id state');

  if (batch === undefined) {
    throw new StockUserError(BATCH_MESSAGES.notFound);
  }
  return batch;
};

const readPickingIds = async (batchIds: string[]) =>
  (await stockPickings.find<{ id: string }>({ batchId: { in: batchIds } }, 'id')).map((picking) => picking.id);

// Marks the draft transfers as to do and starts the batch.
export const confirmBatchButton = async (batchId: string) => {
  const batch = await readBatch(batchId);
  const refusal = planBatchConfirm({ state: batch.state, pickingCount: (await readPickingIds([batch.id])).length });

  if (refusal !== null) {
    throw new StockUserError(BATCH_MESSAGES[refusal]);
  }
  await confirmBatch(batch.id);
};

// Reserves stock for every transfer of the batch, marking draft ones as to do first.
export const checkBatchAvailability = async (batchId: string) => {
  const batch = await readBatch(batchId);
  const pickingIds = await readPickingIds([batch.id]);
  const moves = await stockMoves.find<{ state: string }>({ pickingId: { in: pickingIds } }, 'state');
  const refusal = planBatchCheckAvailability({ state: batch.state, moveStates: moves.map((move) => move.state) });

  if (refusal !== null) {
    throw new StockUserError(BATCH_MESSAGES[refusal]);
  }
  await holdTransfers(pickingIds, () => assignPickings(pickingIds));
};

// The transfers leave the batch and stay as they are. They leave before the
// state is written: a stop in between leaves an emptied batch in progress,
// which the transfer rules cancel, so a second click is never refused for a
// batch that still holds its transfers.
export const cancelBatchButton = async (batchId: string) => {
  const batch = await readBatch(batchId);
  const refusal = planBatchCancel({ state: batch.state });

  if (refusal !== null) {
    throw new StockUserError(BATCH_MESSAGES[refusal]);
  }
  await stockPickings.updateMany(await readPickingIds([batch.id]), { batchId: null });
  await stockPickingBatches.update(batch.id, { state: BATCH_STATE.CANCEL });
  await recomputeBatchState([batch.id]);
};

export const unreserveBatches = async (batchIds: string[]) => {
  await unreservePickings(await readPickingIds(batchIds));
};

const CLOSED_LINE_STATES = new Set<string>([MOVE_STATE.DRAFT, MOVE_STATE.DONE, MOVE_STATE.CANCEL]);

// The open move lines of the batch's transfers the user can read, for the Put in Pack pop-up.
export const readBatchPackLines = async (batchId: string) => {
  const batch = await readBatch(batchId);

  if (batch.state === BATCH_STATE.DONE || batch.state === BATCH_STATE.CANCEL) {
    throw new StockUserError(BATCH_MESSAGES.packClosed);
  }
  const lines = await stockMoveLines.find<{ id: string; state: string }>({ pickingId: { in: await readPickingIds([batch.id]) } }, 'id state');
  const moveLineIds = await filterReadableIds(
    'stockMoveLine',
    'stockMoveLines',
    lines.filter((line) => !CLOSED_LINE_STATES.has(line.state)).map((line) => line.id),
  );

  if (moveLineIds.length === 0) {
    throw new StockUserError(NOTHING_TO_PACK);
  }
  return moveLineIds;
};
