import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';

export type WarehouseRoutingPlan = {
  routeCreates: (Omit<RouteRow, 'warehouseIds'> & { linkWarehouse: boolean })[];
  routeUpdates: { id: string; values: Partial<Pick<RouteRow, 'name' | 'active'>> }[];
  routeWarehouseLinks: { routeId: string; warehouseId: string }[];
  ruleCreates: RuleRow[];
  ruleUpdates: { id: string; values: Partial<Omit<RuleRow, 'id' | 'routeId'>> }[];
  warehouseUpdates: Partial<Pick<RoutingWarehouse, 'receptionRouteId' | 'deliveryRouteId' | 'mtoPullId'>>;
  locationUpdates: { id: string; values: { active: boolean } }[];
};
