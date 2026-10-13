import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { settleTransferEventDates } from 'src/product-expiry/settle-move-line-dates';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handlePickingCreated } from 'src/stock/picking/rules/picking-created';
import { handlePickingDates } from 'src/stock/picking/rules/picking-dates';
import { handlePickingDeletes } from 'src/stock/picking/rules/picking-delete';
import { handlePickingPriority, handlePickingPropagation } from 'src/stock/picking/rules/picking-propagation';
import { handlePickingTypeChanged } from 'src/stock/picking/rules/picking-type-changed';
import { STOCK_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';
import { handlePickingBatchRules } from 'src/stock-picking-batch/picking-batch-rules';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<PickingEventRecord>>) => {
  const { operation, events } = readEvents<PickingEventRecord>(payload);
  const errors = errorCollector();

  await handlePickingCreated(events, operation, errors);
  await handlePickingTypeChanged(events, operation, errors);
  await handlePickingDates(events, operation, errors);
  await errors.run('line expiry dates', () => settleTransferEventDates(operation, events));
  await handlePickingPropagation(events, operation, errors);
  await handlePickingPriority(events, operation, errors);
  await handlePickingDeletes(events, operation, errors);
  await handlePickingBatchRules(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-picking',
  description:
    'Names a new transfer and fills its locations, policy and responsible; follows a changed operation type, contact, locations, dates and priority onto its moves; dates its lines again when its scheduled date moves; cancels and removes a deleted transfer; types its batch and gives it the batch responsible, cancels a batch it leaves empty, leaves its batch when cancelled, and keeps the state and date of its batch; puts a transfer that gets ready into a batch when its operation type batches automatically; puts back the changes the rules refuse.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPicking.*', batchMode: true },
});
