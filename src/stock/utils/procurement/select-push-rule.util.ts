import { locationChain } from 'src/stock/utils/procurement/location-chain.util';
import {
  compareRules,
  packagingRouteIds,
  productRouteIds,
  warehouseRouteIds,
} from 'src/stock/utils/procurement/select-pull-rule.util';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';
import { type RuleValues } from 'src/stock/utils/procurement/types/rule-values.type';

// Walks up from the destination; at each location the move's routes, then the
// packaging's, then the product's and category's, then the warehouse's.
export const selectPushRule = (
  {
    product,
    locationDestId,
    values,
    excludedRuleIds = [],
  }: { product: RoutingProduct; locationDestId: string; values: RuleValues; excludedRuleIds?: string[] },
  data: RoutingData,
): RoutingRule | null => {
  const warehouseId = values.warehouseId ?? null;
  const excluded = new Set(excludedRuleIds);
  const routeLists = [
    values.routeIds ?? [],
    packagingRouteIds(values.packagingUomId, data),
    productRouteIds(product, data),
    warehouseId === null ? [] : warehouseRouteIds(warehouseId, data),
  ];

  for (const location of locationChain(locationDestId, data.locations)) {
    const candidates = data.rules.filter(
      (rule) =>
        rule.locationSrcId === location.id &&
        (rule.action === 'PUSH' || rule.action === 'PULL_PUSH') &&
        (warehouseId === null || rule.warehouseId === null || rule.warehouseId === warehouseId) &&
        !excluded.has(rule.id),
    );

    for (const routeIds of routeLists) {
      const accepted = new Set(routeIds.filter((routeId) => data.routes.has(routeId)));

      if (accepted.size === 0) {
        continue;
      }
      const [rule] = candidates.filter((candidate) => accepted.has(candidate.routeId)).sort(compareRules);

      if (rule !== undefined) {
        return rule;
      }
    }
  }

  return null;
};
