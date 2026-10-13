import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeCategoryRoutes } from 'src/stock/route/recompute-category-routes';
import { stockRouteCategs } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';

type LinkRecord = { id: string; productCategoryId: string | null };

const REBUILT_ON = new Set(['created', 'restored', 'deleted']);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkRecord>>) => {
  const { operation, events } = readEvents<LinkRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    await errors.run('links', () => stockRouteCategs.destroySoftDeleted(events.map((event) => event.recordId)));
  }
  if (REBUILT_ON.has(operation)) {
    const categoryIds = events.flatMap((event) => (eventAfter(event) ?? eventBefore(event))?.productCategoryId ?? []);

    await errors.run('total routes', () => recomputeCategoryRoutes(categoryIds));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRouteCateg,
  name: 'platform-stock-route-categ',
  description:
    'Rebuilds the total routes of a category and its sub-categories when a route is added to or removed from it, and removes the link for good once it is deleted.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockRouteCateg.*', batchMode: true },
});
