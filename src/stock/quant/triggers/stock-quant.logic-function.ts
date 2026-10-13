import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleCountQuantCreates } from 'src/stock/quant/rules/count-quant-creates';
import { handleCountTyped } from 'src/stock/quant/rules/count-typed';
import { handleQuantDeletes } from 'src/stock/quant/rules/quant-deletes';
import { handleQuantKeyEdits } from 'src/stock/quant/rules/quant-key-edits';
import { type QuantEventRecord } from 'src/stock/quant/types/quant-event-record.type';
import { STOCK_QUANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<QuantEventRecord>>) => {
  const { operation, events } = readEvents<QuantEventRecord>(payload);
  const errors = errorCollector();

  await handleCountQuantCreates(events, operation, errors);
  await handleQuantKeyEdits(events, operation, errors);
  await handleCountTyped(events, operation, errors);
  await handleQuantDeletes(events, operation, errors);
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_QUANT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-quant',
  description:
    'Turns a stock row a user adds into a count on the row of that product and location, keeps the count difference right, and puts back key edits and deletes.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockQuant.*', batchMode: true },
});
