import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type WarehouseRoutingLocation } from 'src/stock/utils/types/warehouse-routing-location.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type RouteLink } from 'src/stock/warehouse/types/route-link.type';
import { type RoutingTable } from 'src/stock/warehouse/types/routing-table.type';
import { type RoutingWarehouseRecord } from 'src/stock/warehouse/types/routing-warehouse-record.type';

// Everything the routing writer reads and writes, so a test can stop it at any write.
// Reads leave out trashed rows unless they say otherwise; archived rows are in.
export type WarehouseRoutingStore = {
  readWarehouses: (ids: string[]) => Promise<RoutingWarehouseRecord[]>;
  findSeedLocationId: (seedKey: string) => Promise<string | null>;
  findMtoRouteId: () => Promise<string | null>;
  readRouteLinksOfWarehouse: (warehouseId: string) => Promise<RouteLink[]>;
  readRouteLinksOfRoutes: (routeIds: string[]) => Promise<RouteLink[]>;
  // The warehouses that resupply this one.
  readSupplierIds: (warehouseId: string) => Promise<string[]>;
  // Routes with these ids, and every route that resupplies the warehouse or that it resupplies.
  readRoutes: (ids: string[], warehouseId: string) => Promise<Omit<RouteRow, 'warehouseIds'>[]>;
  // Rules of these routes, rules of the warehouse, and rules with these ids.
  readRules: (routeIds: string[], warehouseId: string, ids: string[]) => Promise<RuleRow[]>;
  readLocations: (ids: string[]) => Promise<({ id: string } & WarehouseRoutingLocation)[]>;
  // Rows with these ids, trashed ones too.
  readRowStates: (table: RoutingTable, ids: string[]) => Promise<{ id: string; deletedAt: string | null }[]>;
  // Trashed links between the warehouse and these routes.
  readTrashedLinks: (warehouseId: string, routeIds: string[]) => Promise<(RouteLink & { id: string })[]>;
  createRows: (table: RoutingTable, rows: { id: string; data: Record<string, unknown> }[]) => Promise<void>;
  restoreRows: (table: RoutingTable | 'links', ids: string[]) => Promise<void>;
  updateRow: (table: RoutingTable, id: string, data: Record<string, unknown>) => Promise<void>;
  createLinks: (links: RouteLink[]) => Promise<void>;
  updateWarehouse: (id: string, data: Record<string, unknown>) => Promise<void>;
  updateLocation: (id: string, data: Record<string, unknown>) => Promise<void>;
};
