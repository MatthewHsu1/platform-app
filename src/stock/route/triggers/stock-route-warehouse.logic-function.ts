import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeOrderpointsForRouteWarehouseLinks } from 'src/stock/orderpoint/orderpoint-recompute-triggers';
import { stockRouteWarehouses, stockRules, stockWarehouses } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { reconcileWarehouseClaimed } from 'src/stock/warehouse/reconcile-warehouse-claimed';

type LinkRecord = { id: string; stockRouteId: string | null; stockWarehouseId: string | null };

// A warehouse added to or removed from the route that holds its
// make-to-order rule gets that rule refreshed.
const refreshMakeToOrderRules = async (links: LinkRecord[]) => {
  const warehouseIds = [...new Set(links.flatMap((link) => link.stockWarehouseId ?? []))];
  const warehouses = await stockWarehouses.find<{ id: string; mtoPullId: string | null }>(
    { id: { in: warehouseIds } },
    'id mtoPullId',
  );
  const mtoRules = await stockRules.find<{ id: string; routeId: string | null }>(
    { id: { in: warehouses.flatMap((warehouse) => warehouse.mtoPullId ?? []) } },
    'id routeId',
  );
  const errors = errorCollector();

  for (const warehouse of warehouses) {
    const routeId = mtoRules.find((rule) => rule.id === warehouse.mtoPullId)?.routeId;

    if (links.some((link) => link.stockWarehouseId === warehouse.id && link.stockRouteId === routeId)) {
      await errors.run(warehouse.id, () => reconcileWarehouseClaimed(warehouse.id, 'updated', { refreshGlobalRules: true }));
    }
  }
  errors.throwIfAny();
};

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkRecord>>) => {
  const { operation, events } = readEvents<LinkRecord>(payload);
  const errors = errorCollector();

  // Ticking a link that was unticked before brings back the same row.
  if (operation === 'created' || operation === 'restored') {
    await errors.run('make-to-order rules', () => refreshMakeToOrderRules(events.flatMap((event) => eventAfter(event) ?? [])));
  }
  if (operation === 'deleted') {
    await errors.run('make-to-order rules', () => refreshMakeToOrderRules(events.flatMap((event) => eventBefore(event) ?? [])));
    await errors.run('links', () => stockRouteWarehouses.destroySoftDeleted(events.map((event) => event.recordId)));
  }
  await recomputeOrderpointsForRouteWarehouseLinks(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRouteWarehouse,
  name: 'platform-stock-route-warehouse',
  description:
    "Refreshes a warehouse's make-to-order rule when the warehouse is added to or removed from that rule's route, removes a route warehouse link for good once it is deleted, and recomputes the reordering rules in the background.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockRouteWarehouse.*', batchMode: true },
});
