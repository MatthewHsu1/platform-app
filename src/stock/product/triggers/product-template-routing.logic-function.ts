import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { productTemplates, stockRouteProducts } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<{ id: string }>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    const removed = await stillDeletedIds(
      productTemplates,
      events.map((event) => event.recordId),
    );

    await destroyLinksOf(stockRouteProducts, 'productTemplateId', removed);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplate,
  name: 'platform-product-template-routing',
  description: "Removes a deleted product's route links for good.",
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplate.deleted', batchMode: true },
});
