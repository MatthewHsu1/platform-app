import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { confirmPickings } from 'src/stock/picking/actions/confirm-pickings';
import { PICKING_STATE } from 'src/stock/stock-options.constant';

// Marks the draft transfers as to do, then puts the batch in progress. The
// caller checks that the batch has transfers.
export const confirmBatch = async (batchId: string) => {
  const drafts = await stockPickings.find<{ id: string }>({ batchId: { eq: batchId }, state: { eq: PICKING_STATE.DRAFT } }, 'id');

  await confirmPickings(drafts.map((picking) => picking.id));
  await stockPickingBatches.update(batchId, { state: BATCH_STATE.IN_PROGRESS });
  await recomputeBatchState([batchId]);
};
