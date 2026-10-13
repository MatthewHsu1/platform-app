import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type WarehouseRoutingPlan } from 'src/stock/utils/types/warehouse-routing-plan.type';

// The plan's working copy of the rows: the planners change it, then the plan
// lists what differs from the rows read.
export type RoutingDraft = {
  routes: Map<string, RouteRow>;
  rules: Map<string, RuleRow>;
  createdRouteIds: Set<string>;
  createdRuleIds: Set<string>;
  locationUpdates: WarehouseRoutingPlan['locationUpdates'];
  ruleName: (code: string, from: string, to: string, suffix?: string) => string;
  rulesOfRoute: (routeId: string) => RuleRow[];
  addRoute: (role: string, values: Omit<RouteRow, 'id'>) => string;
  addRule: (role: string, values: Omit<RuleRow, 'id'>) => string;
  // The rule a role names, unless the draft already holds it.
  addRuleOnce: (role: string, values: Omit<RuleRow, 'id'>) => void;
  setRouteActive: (routeId: string, active: boolean) => void;
  mtoRuleValues: (owner: Pick<RoutingWarehouse, 'id' | 'code'>, from: string, to: string, typeId: string) => Omit<RuleRow, 'id'>;
  isTransit: (locationId: string | null) => boolean;
};
