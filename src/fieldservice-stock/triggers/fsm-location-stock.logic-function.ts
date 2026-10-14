import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { applyLocationInventory } from 'src/fieldservice-stock/location/apply-location-inventory';
import { readEvents } from 'src/shared/triggers/batch-events';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await applyLocationInventory(operation, events);

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmLocation,
  name: 'platform-fsm-location-stock',
  description:
    'Gives a service location the stock location of its parent, of the contact or company it was made from, or Customers, and hands a changed stock location down to the locations below.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmLocation.*', batchMode: true },
});
