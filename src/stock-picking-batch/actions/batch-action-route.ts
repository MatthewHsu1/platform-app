import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { filterReadableIds, requireUpdateRights } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds } from 'src/stock/stock-route';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

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

// A batch button changes the batch and its transfers: the user's role must allow editing both.
export const requireBatchUpdateRights = () =>
  requireUpdateRights([STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER]);

export const readBatchIdsToChange = async (body: Record<string, unknown>) => {
  const batchIds = await readRequestedBatchIds(body);

  await requireBatchUpdateRights();

  return batchIds;
};

export const readBatchIdToChange = async (body: Record<string, unknown>) => {
  const batchId = await readRequestedBatchId(body);

  await requireBatchUpdateRights();

  return batchId;
};
