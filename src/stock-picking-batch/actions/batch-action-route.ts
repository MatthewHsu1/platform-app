import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds } from 'src/stock/stock-route';

// The clicking user must be able to read every batch they asked for. The ids
// keep the order of the selection: Merge keeps the first one.
export const readRequestedBatchIds = async (body: Record<string, unknown>) => {
  const requested = readIds(body, 'batchIds');
  const readable = await filterReadableIds('stockPickingBatch', 'stockPickingBatches', requested);

  if (requested.length === 0 || readable.length !== requested.length) {
    throw new StockUserError(BATCH_MESSAGES.notFound);
  }

  return readable;
};

// The buttons that work on one batch, as the batch form's buttons do.
export const readRequestedBatchId = async (body: Record<string, unknown>) => {
  const batchIds = await readRequestedBatchIds(body);

  if (batchIds.length !== 1) {
    throw new StockUserError(BATCH_MESSAGES.oneAtATime);
  }

  return batchIds[0];
};
