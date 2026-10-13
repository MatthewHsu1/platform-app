import { type RoutingLocation } from 'src/stock/utils/procurement/types/routing-location.type';
import { type RoutingRoute } from 'src/stock/utils/procurement/types/routing-route.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

// Everything rule selection reads. Rules and routes hold active rows only.
export type RoutingData = {
  locations: Map<string, RoutingLocation>;
  rules: RoutingRule[];
  routes: Map<string, RoutingRoute>;
  categoryTotalRouteIds: Map<string, string[]>;
  warehouseRouteIds: Map<string, string[]>;
  packageTypeRouteIds: Map<string, string[]>;
  unitPackageTypeIds: Map<string, string | null>;
};
