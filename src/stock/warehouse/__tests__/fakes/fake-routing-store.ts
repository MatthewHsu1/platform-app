import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type WarehouseRoutingLocation } from 'src/stock/utils/types/warehouse-routing-location.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type RoutingTable } from 'src/stock/warehouse/types/routing-table.type';
import { type RoutingWarehouseRecord } from 'src/stock/warehouse/types/routing-warehouse-record.type';
import { type WarehouseRoutingStore } from 'src/stock/warehouse/types/warehouse-routing-store.type';

type Trashable<TRow> = TRow & { deletedAt: string | null };
type StoredRoute = Trashable<Omit<RouteRow, 'warehouseIds'> & { seedKey: string | null }>;
type StoredRule = Trashable<RuleRow>;
type StoredLink = Trashable<{ id: string; routeId: string; warehouseId: string }>;

const SEEDS: Record<string, string> = {
  'stock.stock_location_suppliers': 'vendors',
  'stock.stock_location_customers': 'customers',
  'stock.location_internal_transit': 'transit',
};

const LOCATION_SUFFIXES = {
  lotStockId: 'Stock',
  whInputStockLocId: 'Input',
  whQcStockLocId: 'Quality Control',
  whOutputStockLocId: 'Output',
  whPackStockLocId: 'Packing Zone',
} as const;

const TRASHED_AT = '2026-10-09T00:00:00.000Z';

// Stores rows and can stop at the Nth write. It decides no rule.
export const makeFakeRoutingStore = ({ stopAtWrite }: { stopAtWrite?: number } = {}) => {
  const warehouses = new Map<string, RoutingWarehouseRecord>();
  const locations = new Map<string, WarehouseRoutingLocation>([
    ['vendors', { name: 'Vendors', usage: 'SUPPLIER', active: true }],
    ['customers', { name: 'Customers', usage: 'CUSTOMER', active: true }],
    ['transit', { name: 'Inter-warehouse transit', usage: 'TRANSIT', active: false }],
  ]);
  const tables = {
    routes: new Map<string, StoredRoute>([
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
          seedKey: 'stock.route_warehouse0_mto',
          deletedAt: null,
        },
      ],
    ]),
    rules: new Map<string, StoredRule>(),
  };
  const links = new Map<string, StoredLink>();
  const resupply: { suppliedWhId: string; supplierWhId: string }[] = [];
  const state = { writes: 0, stopAtWrite };

  const write = () => {
    state.writes += 1;
    if (state.stopAtWrite !== undefined && state.writes === state.stopAtWrite) {
      throw new Error('stopped');
    }
  };
  const live = <TRow extends { deletedAt: string | null }>(rows: Iterable<TRow>) => [...rows].filter((row) => row.deletedAt === null);
  const strip = <TRow extends { deletedAt: string | null }>({ deletedAt: _deletedAt, ...row }: TRow) => row;

  const store: WarehouseRoutingStore = {
    readWarehouses: async (ids) => ids.flatMap((id) => (warehouses.has(id) ? [{ ...warehouses.get(id)! }] : [])),
    findSeedLocationId: async (seedKey) => SEEDS[seedKey] ?? null,
    findMtoRouteId: async () => live(tables.routes.values()).find((route) => route.seedKey === 'stock.route_warehouse0_mto')?.id ?? null,
    readRouteLinksOfWarehouse: async (warehouseId) =>
      live(links.values())
        .filter((link) => link.warehouseId === warehouseId)
        .map(({ routeId, warehouseId: linked }) => ({ routeId, warehouseId: linked })),
    readRouteLinksOfRoutes: async (routeIds) =>
      live(links.values())
        .filter((link) => routeIds.includes(link.routeId))
        .map(({ routeId, warehouseId }) => ({ routeId, warehouseId })),
    readSupplierIds: async (warehouseId) =>
      resupply.filter((link) => link.suppliedWhId === warehouseId).map((link) => link.supplierWhId),
    readRoutes: async (ids, warehouseId) =>
      live(tables.routes.values())
        .filter((route) => ids.includes(route.id) || route.suppliedWhId === warehouseId || route.supplierWhId === warehouseId)
        .map(({ seedKey: _seedKey, ...route }) => strip(route)),
    readRules: async (routeIds, warehouseId, ids) =>
      live(tables.rules.values())
        .filter(
          (rule) => (rule.routeId !== null && routeIds.includes(rule.routeId)) || rule.warehouseId === warehouseId || ids.includes(rule.id),
        )
        .map((rule) => strip(rule)),
    readLocations: async (ids) => ids.flatMap((id) => (locations.has(id) ? [{ id, ...locations.get(id)! }] : [])),
    readRowStates: async (table, ids) =>
      ids.flatMap((id) => {
        const row = tables[table].get(id);
        return row === undefined ? [] : [{ id, deletedAt: row.deletedAt }];
      }),
    readTrashedLinks: async (warehouseId, routeIds) =>
      [...links.values()]
        .filter((link) => link.deletedAt !== null && link.warehouseId === warehouseId && routeIds.includes(link.routeId))
        .map(({ id, routeId, warehouseId: linked }) => ({ id, routeId, warehouseId: linked })),

    createRows: async (table: RoutingTable, rows) => {
      write();
      for (const row of rows) {
        if (tables[table].has(row.id)) {
          throw new Error(`duplicate id ${row.id}`);
        }
      }
      for (const row of rows) {
        const base = table === 'routes' ? { seedKey: null } : {};
        (tables[table] as Map<string, unknown>).set(row.id, { ...base, ...row.data, id: row.id, deletedAt: null });
      }
    },
    restoreRows: async (table, ids) => {
      write();
      const rows: Map<string, { deletedAt: string | null }> = table === 'links' ? links : tables[table];
      for (const id of ids) {
        rows.get(id)!.deletedAt = null;
      }
    },
    updateRow: async (table, id, data) => {
      write();
      const row = tables[table].get(id);
      if (row === undefined || row.deletedAt !== null) {
        throw new Error(`no live row ${id}`);
      }
      Object.assign(row, data);
    },
    createLinks: async (newLinks) => {
      write();
      for (const link of newLinks) {
        const id = `${link.routeId}|${link.warehouseId}`;
        if (links.has(id)) {
          throw new Error(`duplicate link ${id}`);
        }
        links.set(id, { id, ...link, deletedAt: null });
      }
    },
    updateWarehouse: async (id, data) => {
      write();
      Object.assign(warehouses.get(id)!, data);
    },
    updateLocation: async (id, data) => {
      write();
      Object.assign(locations.get(id)!, data);
    },
  };

  // The warehouse as the location and operation type part leaves it.
  const addWarehouse = (code: string, { deliverySteps = 'SHIP_ONLY' }: { deliverySteps?: RoutingWarehouseRecord['deliverySteps'] } = {}) => {
    const id = `wh-${code}`;
    for (const [field, name] of Object.entries(LOCATION_SUFFIXES)) {
      locations.set(`${id}-${field}`, { name, usage: 'INTERNAL', active: true });
    }
    warehouses.set(id, {
      id,
      name: `Warehouse ${code}`,
      code,
      active: true,
      receptionSteps: 'ONE_STEP',
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

  const byId = <TRow extends { id: string }>(rows: Iterable<TRow>) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

  return {
    store,
    state,
    addWarehouse,
    warehouse: (id: string) => warehouses.get(id)!,
    linkResupply: (suppliedWhId: string, supplierWhId: string) => resupply.push({ suppliedWhId, supplierWhId }),
    trash: (table: RoutingTable | 'links', id: string) => {
      const rows: Map<string, { deletedAt: string | null }> = table === 'links' ? links : tables[table];
      rows.get(id)!.deletedAt = TRASHED_AT;
    },
    // Gone for good, as a row that never existed.
    remove: (table: RoutingTable | 'links', id: string) => {
      const rows: Map<string, unknown> = table === 'links' ? links : tables[table];
      rows.delete(id);
    },
    rules: () => byId(tables.rules.values()),
    links: () => byId(links.values()),
    snapshot: () => ({
      warehouses: byId(warehouses.values()),
      locations: [...locations.entries()].sort(([a], [b]) => a.localeCompare(b)),
      routes: byId(tables.routes.values()),
      rules: byId(tables.rules.values()),
      links: byId(links.values()),
    }),
  };
};
