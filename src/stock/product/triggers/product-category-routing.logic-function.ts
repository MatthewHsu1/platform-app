import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { destroyLinksOf, restoreCascaded, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { syncPutawayRules } from 'src/stock/putaway/sync-putaway-rules';
import { recomputeCategoryRoutes } from 'src/stock/route/recompute-category-routes';
import { productCategories, stockPutawayRules, stockRouteCategs, stockRouteCategTotals } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { restoredParents } from 'src/stock/stock-event-helpers';
import { destroyWaveLinksOfCategories } from 'src/stock-picking-batch/wave-links';

type CategoryRecord = { id: string; deletedAt?: string | null };

const PUTAWAY_RULES = [{ of: stockPutawayRules, field: 'categoryId' }];

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<CategoryRecord>>) => {
  const { operation, events } = readEvents<CategoryRecord>(payload);
  const ids = events.map((event) => event.recordId);
  const errors = errorCollector();

  if (operation === 'created') {
    await errors.run('total routes', () => recomputeCategoryRoutes(ids));
  }
  if (operation === 'updated') {
    const moved = events
      .filter((event) => updatedFieldsOf(event).some((field) => field === 'parent' || field === 'parentId'))
      .map((event) => event.recordId);
    const renamed = events.filter((event) => updatedFieldsOf(event).includes('name')).map((event) => event.recordId);

    await errors.run('total routes', () => recomputeCategoryRoutes(moved));
    if (renamed.length > 0) {
      await errors.run('putaway rule names', () => syncPutawayRules({ categoryId: { in: renamed } }));
    }
  }
  if (operation === 'deleted') {
    await errors.run('putaway rules', () =>
      cascadeDelete({ parents: productCategories, parentIds: ids, children: PUTAWAY_RULES }),
    );
    const removed = await stillDeletedIds(productCategories, ids);

    await errors.run('route links', () => destroyLinksOf(stockRouteCategs, 'productCategoryId', removed));
    await errors.run('total routes', () => destroyLinksOf(stockRouteCategTotals, 'productCategoryId', removed));
    await errors.run('wave links', () => destroyWaveLinksOfCategories(removed));
  }
  if (operation === 'restored') {
    await errors.run('putaway rules', () =>
      restoreCascaded({
        parents: restoredParents(events),
        children: PUTAWAY_RULES,
      }),
    );
    await errors.run('total routes', () => recomputeCategoryRoutes(ids));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productCategory,
  name: 'platform-product-category-routing',
  description:
    "Keeps a category's total routes (its own and its parents') and its putaway rule names, deletes or restores its putaway rules with it, and removes its route and wave links once deleted.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productCategory.*', batchMode: true },
});
