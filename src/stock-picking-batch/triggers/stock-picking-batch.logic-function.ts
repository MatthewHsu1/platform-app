import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeBatchCounts } from 'src/stock-picking-batch/recompute-batch-state';
import { handleBatchDeletes } from 'src/stock-picking-batch/rules/batch-deletes';
import { handleBatchSaves } from 'src/stock-picking-batch/rules/batch-saves';
import { STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { type BatchRow } from 'src/stock-picking-batch/types/batch-row.type';

// Runs for the app's writes too: buttons and rules write states and types as
// the app, and the counts on the operation type must follow them.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<BatchRow>>) => {
  const { operation, events } = readEvents<BatchRow>(payload);
  const errors = errorCollector();
  const countTypeIds = new Set<string>();

  await handleBatchSaves(events, operation, errors, countTypeIds);
  await handleBatchDeletes(events, operation, errors, countTypeIds);
  await errors.run('batch counts', () => recomputeBatchCounts([...countTypeIds]));

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.batchTrigger,
  name: 'platform-stock-picking-batch',
  description:
    'Names batches and waves from their operation type, puts back a type their transfers do not fit, copies the responsible and a typed date onto their transfers, puts back deleting a done batch and lets the transfers of another deleted batch go, and keeps the open batch and wave counts on operation types.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPickingBatch.*', batchMode: true },
});
