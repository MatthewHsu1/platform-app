import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeOrderpointsForRouteProductLinks } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { stockRouteProducts } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

const destroyDeletedLinks = destroyDeletedLinksHandler(stockRouteProducts);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  await errors.run('links', () => destroyDeletedLinks(payload));
  await recomputeOrderpointsForRouteProductLinks(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRouteProduct,
  name: 'platform-stock-route-product',
  description:
    "Removes a route product link for good once it is deleted, and recomputes the reordering rules of the product's variants.",
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockRouteProduct.*', batchMode: true },
});
