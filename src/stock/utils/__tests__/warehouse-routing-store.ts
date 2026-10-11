import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';
import { planWarehouseRouting } from 'src/stock/utils/plan-warehouse-routing.util';
import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type WarehouseRoutingLocation } from 'src/stock/utils/types/warehouse-routing-location.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type SupplierWarehouse } from 'src/stock/utils/types/supplier-warehouse.type';
import { type WarehouseRoutingPlan } from 'src/stock/utils/types/warehouse-routing-plan.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';

// An in-memory copy of the rows the writer would hold, so a test can run the
// planner, apply its plan, change the warehouse and run it again. It starts with
// Vendors, Customers, an inactive transit location and the inactive make-to-order route.
type RoutingTestStore = {
  warehouses: Map<string, RoutingWarehouse>;
  locations: Map<string, WarehouseRoutingLocation>;
  routes: Map<string, RouteRow>;
  rules: Map<string, RuleRow>;
  mtoRouteId: string | null;
  requests: number;
};

const LOCATION_SUFFIXES = {
  lotStockId: 'Stock',
  whInputStockLocId: 'Input',
  whQcStockLocId: 'Quality Control',
  whOutputStockLocId: 'Output',
  whPackStockLocId: 'Packing Zone',
} as const;

export const emptyStore = (): RoutingTestStore => ({
  warehouses: new Map(),
  locations: new Map([
    ['vendors', { name: 'Vendors', usage: 'SUPPLIER', active: true }],
    ['customers', { name: 'Customers', usage: 'CUSTOMER', active: true }],
    ['transit', { name: 'Inter-warehouse transit', usage: 'TRANSIT', active: false }],
  ]),
  routes: new Map([
    [
      'mto',
      {
        id: 'mto',
        name: 'Replenish on Order (MTO)',
        active: false,
        sequence: 5,
        productSelectable: true,
        productCategSelectable: true,
        warehouseSelectable: false,
        suppliedWhId: null,
        supplierWhId: null,
        warehouseIds: [],
      },
    ],
  ]),
  rules: new Map(),
  mtoRouteId: 'mto',
  requests: 0,
});

// The warehouse as the location and operation type part leaves it: five locations and the types exist.
export const addWarehouse = (
  store: RoutingTestStore,
  code: string,
  {
    name = code,
    receptionSteps = 'ONE_STEP',
    deliverySteps = 'SHIP_ONLY',
  }: { name?: string; receptionSteps?: ReceptionSteps; deliverySteps?: DeliverySteps } = {},
) => {
  const id = `wh-${code}`;
  for (const [field, locationName] of Object.entries(LOCATION_SUFFIXES)) {
    store.locations.set(`${id}-${field}`, { name: locationName, usage: 'INTERNAL', active: true });
  }
  store.warehouses.set(id, {
    id,
    name,
    code,
    active: true,
    receptionSteps,
    deliverySteps,
    receptionRouteId: null,
    deliveryRouteId: null,
    mtoPullId: null,
    lotStockId: `${id}-lotStockId`,
    whInputStockLocId: `${id}-whInputStockLocId`,
    whQcStockLocId: `${id}-whQcStockLocId`,
    whOutputStockLocId: `${id}-whOutputStockLocId`,
    whPackStockLocId: `${id}-whPackStockLocId`,
    inTypeId: `${id}-IN`,
    outTypeId: `${id}-OUT`,
    pickTypeId: `${id}-PICK`,
    packTypeId: `${id}-PACK`,
    qcTypeId: `${id}-QC`,
    storeTypeId: `${id}-STOR`,
  });
  return id;
};

const supplierOf = (warehouse: RoutingWarehouse): SupplierWarehouse => ({
  id: warehouse.id,
  name: warehouse.name,
  code: warehouse.code,
  deliverySteps: warehouse.deliverySteps,
  lotStockId: warehouse.lotStockId,
  whOutputStockLocId: warehouse.whOutputStockLocId,
  outTypeId: warehouse.outTypeId,
  pickTypeId: warehouse.pickTypeId,
});

export const planFor = (store: RoutingTestStore, warehouseId: string, event: WarehouseEvent, change: WarehouseChange = {}) =>
  planWarehouseRouting({
    event,
    change,
    warehouse: { ...store.warehouses.get(warehouseId)! },
    locations: store.locations,
    vendorsLocationId: 'vendors',
    customersLocationId: 'customers',
    transitLocationId: 'transit',
    mtoRouteId: store.mtoRouteId,
    routes: [...store.routes.values()].map((route) => ({ ...route, warehouseIds: [...route.warehouseIds] })),
    rules: [...store.rules.values()].map((rule) => ({ ...rule })),
    suppliers: new Map(
      (change.resupplyAdded ?? []).map((supplierId) => [supplierId, supplierOf(store.warehouses.get(supplierId)!)]),
    ),
    newId: (role) => `${warehouseId}/${role}`,
  });

const applyPlan = (store: RoutingTestStore, warehouseId: string, plan: WarehouseRoutingPlan) => {
  for (const { id, values } of plan.locationUpdates) {
    Object.assign(store.locations.get(id)!, values);
  }
  for (const { linkWarehouse, ...route } of plan.routeCreates) {
    store.routes.set(route.id, { ...route, warehouseIds: linkWarehouse ? [warehouseId] : [] });
  }
  for (const { id, values } of plan.routeUpdates) {
    Object.assign(store.routes.get(id)!, values);
  }
  for (const { routeId, warehouseId: linkedId } of plan.routeWarehouseLinks) {
    store.routes.get(routeId)!.warehouseIds.push(linkedId);
  }
  for (const { id, values } of plan.ruleUpdates) {
    Object.assign(store.rules.get(id)!, values);
  }
  for (const rule of plan.ruleCreates) {
    store.rules.set(rule.id, { ...rule });
  }
  Object.assign(store.warehouses.get(warehouseId)!, plan.warehouseUpdates);
};

// One request: the claim names it once, and a replay of it keeps the name.
export const reconcile = (store: RoutingTestStore, warehouseId: string, event: WarehouseEvent, change: WarehouseChange = {}) => {
  store.requests += 1;
  const plan = planFor(store, warehouseId, event, { requestId: `request-${store.requests}`, ...change });
  applyPlan(store, warehouseId, plan);
  return plan;
};

// Change the warehouse fields, then reconcile with the old values as `before`.
export const update = (store: RoutingTestStore, warehouseId: string, values: Partial<RoutingWarehouse>) => {
  const warehouse = store.warehouses.get(warehouseId)!;
  const before = {
    name: warehouse.name,
    code: warehouse.code,
    receptionSteps: warehouse.receptionSteps,
    deliverySteps: warehouse.deliverySteps,
  };
  Object.assign(warehouse, values);
  const event: WarehouseEvent = values.active === false ? 'archived' : values.active === true ? 'unarchived' : 'updated';
  return reconcile(store, warehouseId, event, { before });
};

// The rules a route holds, as "name [active]", sorted.
export const routeRules = (store: RoutingTestStore, routeId: string | null) =>
  [...store.rules.values()]
    .filter((rule) => rule.routeId === routeId)
    .map((rule) => `${rule.name} [${rule.active ? 'active' : 'archived'}]`)
    .sort();
