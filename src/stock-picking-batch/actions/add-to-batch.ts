import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { confirmBatch } from 'src/stock-picking-batch/confirm-batch';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { readBatchName } from 'src/stock-picking-batch/read-batch-name';
import { validatingBatchIds } from 'src/stock-picking-batch/validating-batches';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type AddToBatchPort } from 'src/stock-picking-batch/types/add-to-batch-port.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { planAddToBatch } from 'src/stock-picking-batch/utils/plan-add-to-batch.util';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';

type AddToBatchRequest = {
  pickingIds: string[];
  mode: 'NEW' | 'EXISTING';
  batchId: string | null;
  responsibleId: string | null;
  description: string | null;
  isCreateDraft: boolean;
  // One per opening of the pop-up: a request sent again makes no second batch.
  runId: string;
};

export const makeAddToBatch =
  (port: AddToBatchPort) =>
  async (request: AddToBatchRequest): Promise<{ created: boolean; name: string }> => {
    const pickings = await port.readPickings(request.pickingIds);
    const batch =
      request.mode === 'EXISTING' && request.batchId !== null ? await port.readChosenBatch(request.batchId) : undefined;

    if (request.mode === 'EXISTING' && request.batchId !== null && batch === undefined) {
      throw new StockUserError(BATCH_MESSAGES.notFound);
    }
    const plan = planAddToBatch({
      mode: request.mode,
      batch: batch ?? null,
      pickings,
      responsibleId: request.responsibleId,
      description: request.description,
      isCreateDraft: request.isCreateDraft,
    });

    if (plan.kind === 'refuse') {
      throw plan.message === 'chooseBatch'
        ? new StockUserError(BATCH_MESSAGES.chooseBatch)
        : new StockUserError(BATCH_MESSAGES.incompatible, { batch: plan.batchName, transfers: plan.transfers.join(', ') });
    }
    const targetId = plan.kind === 'create' ? derivedId('addToBatch', request.runId) : plan.batchId;
    // A batch being validated neither takes nor gives up a transfer until its Validate ends.
    const touchedBatchIds = [...new Set([targetId, ...pickings.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId]))])];

    if ((await port.validatingBatchIds(touchedBatchIds)).length > 0) {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }

    // The batch exists before its transfers join, so it is a draft while they
    // join, and it is confirmed once it holds them. A request sent again finds
    // the batch the first one made; once that batch is done or cancelled, the
    // transfers do not go back into it.
    if (plan.kind === 'create') {
      const state = await port.createBatch(targetId, plan.values);

      if (state === undefined) {
        throw new StockUserError(BATCH_MESSAGES.notFound);
      }
      if (state !== BATCH_STATE.DRAFT && state !== BATCH_STATE.IN_PROGRESS) {
        throw new StockUserError(BATCH_MESSAGES.madeClosed);
      }
    }
    const joining = pickings.filter((picking) => picking.batchId !== targetId).map((picking) => picking.id);

    if (joining.length > 0) {
      await port.moveTransfers(joining, targetId);
    }
    if (plan.kind === 'create' && plan.confirm) {
      await port.confirmBatch(targetId);
    }

    return { created: plan.kind === 'create', name: await port.readBatchName(targetId) };
  };

const readBatchRow = async (batchId: string) =>
  (
    await stockPickingBatches.find<{
      id: string;
      name: string | null;
      state: BatchState;
      pickingTypeId: string | null;
      isWave: boolean;
    }>({ id: { eq: batchId } }, 'id name state pickingTypeId isWave')
  )[0];

// Reads and checks run as the clicking user; the batch and the transfers'
// batch are written by the app, as the other batch buttons do.
export const addToBatch = makeAddToBatch({
  readPickings: async (pickingIds) => {
    const rows = await stockPickings.find<{
      id: string;
      name: string | null;
      state: string;
      pickingTypeId: string | null;
      batchId: string | null;
    }>({ id: { in: pickingIds } }, 'id name state pickingTypeId batchId');
    const byId = new Map(rows.map((row) => [row.id, row]));

    return pickingIds.flatMap((id) => {
      const row = byId.get(id);

      return row === undefined ? [] : [{ ...row, name: row.name ?? '' }];
    });
  },
  readChosenBatch: async (batchId) => {
    if ((await filterReadableIds('stockPickingBatch', 'stockPickingBatches', [batchId])).length === 0) {
      return undefined;
    }
    const row = await readBatchRow(batchId);

    return row === undefined ? undefined : { ...row, name: row.name ?? '' };
  },
  createBatch: async (batchId, values) => {
    await createMissingRows(stockPickingBatches, [{ id: batchId, data: values }]);

    return (await readBatchRow(batchId))?.state;
  },
  validatingBatchIds,
  moveTransfers: (pickingIds, batchId) => stockPickings.updateMany(pickingIds, { batchId }),
  confirmBatch,
  readBatchName,
});
