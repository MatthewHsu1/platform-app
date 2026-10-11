import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { syncCapacityNames } from 'src/stock/storage-category/sync-capacity-names';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<{ id: string }>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'created' || operation === 'updated') {
    await syncCapacityNames({ id: { in: events.map((event) => event.recordId) } });
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockStorageCategoryCapacity,
  name: 'platform-stock-storage-category-capacity',
  description: 'Names each storage capacity after its product or package type and quantity.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockStorageCategoryCapacity.*', batchMode: true },
});
