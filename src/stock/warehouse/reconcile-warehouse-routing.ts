import { translate } from 'src/shared/i18n/translate';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { planWarehouseRouting, WAREHOUSE_ROUTING_ROLES } from 'src/stock/utils/plan-warehouse-routing.util';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type SupplierWarehouse } from 'src/stock/utils/types/supplier-warehouse.type';
import { type WarehouseRoutingInput } from 'src/stock/utils/types/warehouse-routing-input.type';
import { type WarehouseRoutingPlan } from 'src/stock/utils/types/warehouse-routing-plan.type';
import { warehouseRowId } from 'src/stock/warehouse/warehouse-row-id';
import { graphqlWarehouseRoutingStore } from 'src/stock/warehouse/warehouse-routing-store';
import { type RoutingTable } from 'src/stock/warehouse/types/routing-table.type';
import { type RoutingWarehouseRecord } from 'src/stock/warehouse/types/routing-warehouse-record.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';
import { type WarehouseRoutingStore } from 'src/stock/warehouse/types/warehouse-routing-store.type';

type WarehouseFieldUpdates = WarehouseRoutingPlan['warehouseUpdates'];

const REQUIRED_KEYS = [
  'lotStockId',
  'whInputStockLocId',
  'whQcStockLocId',
  'whOutputStockLocId',
  'whPackStockLocId',
  'inTypeId',
  'outTypeId',
  'pickTypeId',
  'packTypeId',
  'qcTypeId',
  'storeTypeId',
] as const;

const isPresent = (id: string | null): id is string => id !== null;

// A warehouse whose locations and operation types are not all made yet gets no routes yet.
const asRoutingWarehouse = (record: RoutingWarehouseRecord): RoutingWarehouse | null =>
  REQUIRED_KEYS.some((key) => record[key] === null)
    ? null
    : ({ ...record, name: record.name ?? '', code: record.code ?? '', active: record.active ?? true } as RoutingWarehouse);

const readInput = async (
  store: WarehouseRoutingStore,
  warehouseId: string,
  event: WarehouseEvent,
  change: WarehouseChange,
): Promise<{ input: WarehouseRoutingInput; adopted: WarehouseFieldUpdates } | null> => {
  const [record] = await store.readWarehouses([warehouseId]);
  const stored = record === undefined ? null : asRoutingWarehouse(record);

  if (stored === null) {
    return null;
  }
  const [vendorsLocationId, customersLocationId, transitLocationId, mtoRouteId, ownLinks, supplierIds] = await Promise.all([
    store.findSeedLocationId(STOCK_SEED_KEYS.suppliers),
    store.findSeedLocationId(STOCK_SEED_KEYS.customers),
    store.findSeedLocationId(STOCK_SEED_KEYS.transit),
    store.findMtoRouteId(),
    store.readRouteLinksOfWarehouse(warehouseId),
    store.readSupplierIds(warehouseId),
  ]);

  if (vendorsLocationId === null || customersLocationId === null) {
    throw new Error(translate(null, 'The Vendors and Customers locations are missing: install the Platform app again.'));
  }
  const newId = (role: string) => warehouseRowId(warehouseId, role);
  const roleIds = {
    receptionRouteId: newId(WAREHOUSE_ROUTING_ROLES.receptionRouteId),
    deliveryRouteId: newId(WAREHOUSE_ROUTING_ROLES.deliveryRouteId),
    mtoPullId: newId(WAREHOUSE_ROUTING_ROLES.mtoPullId),
  };
  const resupplyAdded = event === 'created' ? supplierIds : (change.resupplyAdded ?? []);
  const routeRecords = await store.readRoutes(
    [
      ...new Set(
        [stored.receptionRouteId, stored.deliveryRouteId, roleIds.receptionRouteId, roleIds.deliveryRouteId, ...ownLinks.map((link) => link.routeId)].filter(
          isPresent,
        ),
      ),
    ],
    warehouseId,
  );
  const routeIds = routeRecords.map((route) => route.id);
  const [routeLinks, rules, supplierRecords] = await Promise.all([
    store.readRouteLinksOfRoutes(routeIds),
    store.readRules(
      mtoRouteId === null ? routeIds : [...routeIds, mtoRouteId],
      warehouseId,
      [stored.mtoPullId, roleIds.mtoPullId].filter(isPresent),
    ),
    store.readWarehouses(resupplyAdded),
  ]);

  // Rows a run that stopped made before it could point the warehouse at them.
  const adopted: WarehouseFieldUpdates = {};
  for (const field of ['receptionRouteId', 'deliveryRouteId'] as const) {
    if (stored[field] === null && routeIds.includes(roleIds[field])) {
      adopted[field] = roleIds[field];
    }
  }
  if (stored.mtoPullId === null && rules.some((rule) => rule.id === roleIds.mtoPullId)) {
    adopted.mtoPullId = roleIds.mtoPullId;
  }
  const warehouse: RoutingWarehouse = { ...stored, ...adopted };

  const suppliers = new Map<string, SupplierWarehouse>(
    supplierRecords.flatMap((supplierRecord) => {
      const supplier = asRoutingWarehouse(supplierRecord);
      return supplier === null ? [] : [[supplier.id, supplier] as const];
    }),
  );
  const locationIds = new Set<string>([
    warehouse.lotStockId,
    warehouse.whInputStockLocId,
    warehouse.whQcStockLocId,
    warehouse.whOutputStockLocId,
    warehouse.whPackStockLocId,
    vendorsLocationId,
    customersLocationId,
    ...(transitLocationId === null ? [] : [transitLocationId]),
    ...[...suppliers.values()].flatMap((supplier) => [supplier.lotStockId, supplier.whOutputStockLocId]),
    ...rules.flatMap((rule) => [rule.locationSrcId, rule.locationDestId].filter(isPresent)),
  ]);
  const locations = await store.readLocations([...locationIds]);

  return {
    input: {
      event,
      change: { ...change, resupplyAdded },
      warehouse,
      locations: new Map(locations.map(({ id, name, usage, active }) => [id, { name, usage, active }])),
      vendorsLocationId,
      customersLocationId,
      transitLocationId,
      mtoRouteId,
      routes: routeRecords.map((route) => ({
        ...route,
        warehouseIds: routeLinks.filter((link) => link.routeId === route.id).map((link) => link.warehouseId),
      })),
      rules,
      suppliers,
      newId,
    },
    adopted,
  };
};

// A planned row whose id a trashed row holds is that row brought back; one a
// live row holds was made by a run that stopped, and gets the planned values.
const writeNewRows = async (store: WarehouseRoutingStore, table: RoutingTable, rows: { id: string; data: Record<string, unknown> }[]) => {
  if (rows.length === 0) {
    return;
  }
  const states = new Map((await store.readRowStates(table, rows.map((row) => row.id))).map((state) => [state.id, state]));
  const trashedIds = rows.filter((row) => states.get(row.id)?.deletedAt).map((row) => row.id);

  if (trashedIds.length > 0) {
    await store.restoreRows(table, trashedIds);
  }
  for (const row of rows.filter((candidate) => states.has(candidate.id))) {
    await store.updateRow(table, row.id, row.data);
  }
  const missing = rows.filter((row) => !states.has(row.id));
  if (missing.length > 0) {
    await store.createRows(table, missing);
  }
};

const pick = (values: WarehouseFieldUpdates, keys: (keyof WarehouseFieldUpdates)[]) =>
  Object.fromEntries(Object.entries(values).filter(([key]) => (keys as string[]).includes(key)));

// Each route or rule field of the warehouse is written right after its row exists.
const writePlan = async (store: WarehouseRoutingStore, warehouseId: string, plan: WarehouseRoutingPlan) => {
  for (const { id, values } of plan.locationUpdates) {
    await store.updateLocation(id, values);
  }
  await writeNewRows(
    store,
    'routes',
    plan.routeCreates.map(({ id, linkWarehouse: _linkWarehouse, ...data }) => ({ id, data })),
  );
  const routeFields = pick(plan.warehouseUpdates, ['receptionRouteId', 'deliveryRouteId']);
  if (Object.keys(routeFields).length > 0) {
    await store.updateWarehouse(warehouseId, routeFields);
  }
  // Rules before their route: a run that stops between the two leaves the route as
  // it was, so running it again finds the same change to make.
  for (const { id, values } of plan.ruleUpdates) {
    await store.updateRow('rules', id, values);
  }
  for (const { id, values } of plan.routeUpdates) {
    await store.updateRow('routes', id, values);
  }

  const links = [
    ...plan.routeCreates.filter((route) => route.linkWarehouse).map((route) => ({ routeId: route.id, warehouseId })),
    ...plan.routeWarehouseLinks,
  ];
  if (links.length > 0) {
    // A link staff removed stays in the trash and holds the pair: bring it back.
    const trashed = await store.readTrashedLinks(warehouseId, links.map((link) => link.routeId));
    if (trashed.length > 0) {
      await store.restoreRows('links', trashed.map((link) => link.id));
    }
    const missing = links.filter((link) => !trashed.some((row) => row.routeId === link.routeId));
    if (missing.length > 0) {
      await store.createLinks(missing);
    }
  }

  await writeNewRows(
    store,
    'rules',
    plan.ruleCreates.map(({ id, ...data }) => ({ id, data })),
  );
  const ruleFields = pick(plan.warehouseUpdates, ['mtoPullId']);
  if (Object.keys(ruleFields).length > 0) {
    await store.updateWarehouse(warehouseId, ruleFields);
  }
};

// The routes, rules, make-to-order rule and resupply routes of a warehouse. Runs
// after its locations and operation types exist: the rules point at them.
export const makeReconcileWarehouseRouting =
  (store: WarehouseRoutingStore) =>
  async (warehouseId: string, event: WarehouseEvent, change: WarehouseChange = {}) => {
    const read = await readInput(store, warehouseId, event, change);

    if (read === null) {
      return;
    }
    const plan = planWarehouseRouting(read.input);

    await writePlan(store, warehouseId, { ...plan, warehouseUpdates: { ...read.adopted, ...plan.warehouseUpdates } });
  };

export const reconcileWarehouseRouting = makeReconcileWarehouseRouting(graphqlWarehouseRoutingStore);
