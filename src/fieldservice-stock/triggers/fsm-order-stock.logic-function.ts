import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { applyOrderWarehouses } from 'src/fieldservice-stock/order/apply-order-warehouses';
import { readEvents } from 'src/shared/triggers/batch-events';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'created' || operation === 'updated') {
    return applyOrderWarehouses(operation, events);
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmOrder,
  name: 'platform-fsm-order-stock',
  description:
    'Gives a new service order the default warehouse of its worker or the first warehouse, fills the default warehouse of a worker picked later, and puts back a warehouse that staff cleared.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmOrder.*', batchMode: true },
});
