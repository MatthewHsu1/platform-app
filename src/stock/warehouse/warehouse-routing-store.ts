import { findSeedLocationId } from 'src/stock/location/read-locations';
import { MTO_ROUTE_SEED_KEY } from 'src/stock/routing-options.constant';
import {
  stockLocations,
  stockRoutes,
  stockRouteWarehouses,
  stockRules,
  stockWarehouses,
  stockWhResupplyTables,
} from 'src/stock/routing-records';
import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type WarehouseRoutingLocation } from 'src/stock/utils/types/warehouse-routing-location.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type RoutingWarehouseRecord } from 'src/stock/warehouse/types/routing-warehouse-record.type';
import { type WarehouseRoutingStore } from 'src/stock/warehouse/types/warehouse-routing-store.type';

const WAREHOUSE_SELECTION =
  'id name code active receptionSteps deliverySteps receptionRouteId deliveryRouteId mtoPullId lotStockId whInputStockLocId whQcStockLocId whOutputStockLocId whPackStockLocId inTypeId outTypeId pickTypeId packTypeId qcTypeId storeTypeId';
const ROUTE_SELECTION = 'id name active sequence productSelectable productCategSelectable warehouseSelectable suppliedWhId supplierWhId';
const RULE_SELECTION =
  'id name active action routeId locationSrcId locationDestId pickingTypeId procureMethod warehouseId auto propagateCancel propagateCarrier locationDestFromRule';

const TABLES = { routes: stockRoutes, rules: stockRules } as const;

type LinkRecord = { id: string; stockRouteId: string; stockWarehouseId: string };

const asLink = (link: LinkRecord) => ({ id: link.id, routeId: link.stockRouteId, warehouseId: link.stockWarehouseId });

// Every call uses the app's own access: the routing rows belong to the warehouse, not to the user who saved it.
export const graphqlWarehouseRoutingStore: WarehouseRoutingStore = {
  readWarehouses: (ids) => stockWarehouses.find<RoutingWarehouseRecord>({ id: { in: ids } }, WAREHOUSE_SELECTION),

  findSeedLocationId,

  findMtoRouteId: async () => (await stockRoutes.find<{ id: string }>({ seedKey: { eq: MTO_ROUTE_SEED_KEY } }, 'id'))[0]?.id ?? null,

  readRouteLinksOfWarehouse: async (warehouseId) =>
    (await stockRouteWarehouses.find<LinkRecord>({ stockWarehouseId: { eq: warehouseId } }, 'id stockRouteId stockWarehouseId')).map(asLink),

  readRouteLinksOfRoutes: async (routeIds) =>
    (await stockRouteWarehouses.find<LinkRecord>({ stockRouteId: { in: routeIds } }, 'id stockRouteId stockWarehouseId')).map(asLink),

  readSupplierIds: async (warehouseId) =>
    (await stockWhResupplyTables.find<{ supplierWhId: string }>({ suppliedWhId: { eq: warehouseId } }, 'supplierWhId')).map(
      (link) => link.supplierWhId,
    ),

  readRoutes: (ids, warehouseId) =>
    stockRoutes.find<Omit<RouteRow, 'warehouseIds'>>(
      { or: [{ id: { in: ids } }, { suppliedWhId: { eq: warehouseId } }, { supplierWhId: { eq: warehouseId } }] },
      ROUTE_SELECTION,
    ),

  readRules: (routeIds, warehouseId, ids) =>
    stockRules.find<RuleRow>(
      { or: [{ routeId: { in: routeIds } }, { warehouseId: { eq: warehouseId } }, { id: { in: ids } }] },
      RULE_SELECTION,
    ),

  readLocations: (ids) => stockLocations.find<{ id: string } & WarehouseRoutingLocation>({ id: { in: ids } }, 'id name usage active'),

  readRowStates: (table, ids) => TABLES[table].findIncludingDeleted<{ id: string; deletedAt: string | null }>({ id: { in: ids } }, 'id deletedAt'),

  readTrashedLinks: async (warehouseId, routeIds) =>
    (
      await stockRouteWarehouses.find<LinkRecord>(
        { stockWarehouseId: { eq: warehouseId }, stockRouteId: { in: routeIds }, deletedAt: { is: 'NOT_NULL' } },
        'id stockRouteId stockWarehouseId',
      )
    ).map(asLink),

  createRows: async (table, rows) => {
    await TABLES[table].createMany(rows.map((row) => ({ id: row.id, ...row.data })));
  },
  restoreRows: async (table, ids) => {
    await (table === 'links' ? stockRouteWarehouses : TABLES[table]).restoreMany(ids);
  },
  updateRow: (table, id, data) => TABLES[table].update(id, data),
  createLinks: async (links) => {
    await stockRouteWarehouses.createMany(links.map((link) => ({ stockRouteId: link.routeId, stockWarehouseId: link.warehouseId })));
  },
  updateWarehouse: (id, data) => stockWarehouses.update(id, data),
  updateLocation: (id, data) => stockLocations.update(id, data),
};
