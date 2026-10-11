import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { clearReferences, destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import {
  stockRoutes,
  stockRouteWarehouses,
  stockRules,
  stockWarehouses,
  stockWhResupplyTables,
} from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<{ id: string }>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    const removed = await stillDeletedIds(
      stockWarehouses,
      events.map((event) => event.recordId),
    );

    await errors.run('rules', () => clearReferences(stockRules, 'warehouseId', removed));
    await errors.run('supplied routes', () => clearReferences(stockRoutes, 'suppliedWhId', removed));
    await errors.run('supplier routes', () => clearReferences(stockRoutes, 'supplierWhId', removed));
    await errors.run('route links', () => destroyLinksOf(stockRouteWarehouses, 'stockWarehouseId', removed));
    await errors.run('resupply links', () => destroyLinksOf(stockWhResupplyTables, 'suppliedWhId', removed));
    await errors.run('supplier links', () => destroyLinksOf(stockWhResupplyTables, 'supplierWhId', removed));
  }

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockWarehouse,
  name: 'platform-stock-warehouse-routing',
  description: 'Clears a deleted warehouse from rules and resupply routes and removes its route and resupply links for good.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockWarehouse.deleted', batchMode: true },
});
