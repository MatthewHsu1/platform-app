import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleUomRatioChange } from 'src/stock/product/rules/uom-ratio-change';
import { type UomEventRecord } from 'src/stock/product/types/uom-event-record.type';
import { STOCK_UOM_UOM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<UomEventRecord>>) => {
  const { operation, events } = readEvents<UomEventRecord>(payload);
  const errors = errorCollector();

  await handleUomRatioChange(events, operation, errors);
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_UOM_UOM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-uom-uom',
  description: 'Puts back a unit ratio change while open moves, open lines or stock use the unit.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'uomUom.updated', batchMode: true },
});
