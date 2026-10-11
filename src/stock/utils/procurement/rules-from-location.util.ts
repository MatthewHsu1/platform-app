import { selectPullRule } from 'src/stock/utils/procurement/select-pull-rule.util';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

export class EndlessRuleLoopError extends Error {
  constructor(readonly ruleName: string) {
    super(`Invalid rule's configuration, the following rule causes an endless loop: ${ruleName}`);
  }
}

// The chain of pull rules that supplies a location: stops at a take-from-stock
// rule, a push rule or no rule; the next step starts at the rule's source and
// uses only the routes found there.
export const rulesFromLocation = (
  { product, locationId, routeIds }: { product: RoutingProduct; locationId: string; routeIds?: string[] },
  data: RoutingData,
): RoutingRule[] => {
  const seen: RoutingRule[] = [];
  let currentLocationId: string | null = locationId;
  let currentRouteIds = routeIds ?? [];

  while (currentLocationId !== null) {
    const warehouseId = data.locations.get(currentLocationId)?.warehouseId ?? null;
    const rule = selectPullRule(
      { product, locationId: currentLocationId, values: { routeIds: currentRouteIds, warehouseId } },
      data,
    );

    if (rule === null) {
      return seen;
    }
    if (seen.some((known) => known.id === rule.id)) {
      throw new EndlessRuleLoopError(rule.name);
    }
    seen.push(rule);
    if (rule.procureMethod === 'MAKE_TO_STOCK' || (rule.action !== 'PULL' && rule.action !== 'PULL_PUSH')) {
      return seen;
    }
    currentLocationId = rule.locationSrcId;
    currentRouteIds = [];
  }

  return seen;
};
