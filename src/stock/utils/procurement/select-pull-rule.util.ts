import { locationChain } from 'src/stock/utils/procurement/location-chain.util';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRoute } from 'src/stock/utils/procurement/types/routing-route.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';
import { type RuleValues } from 'src/stock/utils/procurement/types/rule-values.type';

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// Creation time stands in for creation order, which ids do not give.
export const compareRules = (left: RoutingRule, right: RoutingRule) =>
  left.routeSequence - right.routeSequence ||
  left.sequence - right.sequence ||
  compareText(left.createdAt, right.createdAt) ||
  compareText(left.id, right.id);

const activeRouteIds = (routeIds: string[], data: RoutingData) => [
  ...new Set(routeIds.filter((routeId) => data.routes.has(routeId))),
];

export const packagingRouteIds = (packagingUomId: string | null | undefined, data: RoutingData) => {
  const packageTypeId = packagingUomId ? (data.unitPackageTypeIds.get(packagingUomId) ?? null) : null;

  return activeRouteIds(packageTypeId === null ? [] : (data.packageTypeRouteIds.get(packageTypeId) ?? []), data);
};

// The product's own routes and its category's total routes.
export const productRouteIds = (product: RoutingProduct, data: RoutingData) =>
  activeRouteIds(
    [...product.routeIds, ...(product.categoryId === null ? [] : (data.categoryTotalRouteIds.get(product.categoryId) ?? []))],
    data,
  );

export const warehouseRouteIds = (warehouseId: string | null, data: RoutingData) =>
  activeRouteIds(warehouseId === null ? [] : (data.warehouseRouteIds.get(warehouseId) ?? []), data);

// The product's own routes first, then by route sequence.
export const orderRoutes = (routeIds: string[], product: RoutingProduct, data: RoutingData) =>
  activeRouteIds(routeIds, data)
    .flatMap((routeId): RoutingRoute[] => {
      const route = data.routes.get(routeId);
      return route === undefined ? [] : [route];
    })
    .sort(
      (left, right) =>
        Number(!product.routeIds.includes(left.id)) - Number(!product.routeIds.includes(right.id)) ||
        left.sequence - right.sequence ||
        compareText(left.createdAt, right.createdAt),
    );

// Walks up from the location; at each one the procurement's routes, then the
// packaging's, then the product's and category's, then the warehouse's. First hit wins.
export const selectPullRule = (
  { product, locationId, values }: { product: RoutingProduct; locationId: string; values: RuleValues },
  data: RoutingData,
): RoutingRule | null => {
  const chain = locationChain(locationId, data.locations);

  if (chain.length === 0) {
    return null;
  }

  const isWarehouseGiven = values.warehouseId !== undefined;
  const warehouseIds =
    values.warehouseId === undefined
      ? [...new Set(chain.flatMap((location) => (location.warehouseId === null ? [] : [location.warehouseId])))]
      : values.warehouseId === null
        ? []
        : [values.warehouseId];
  const valueRouteIds = values.routeIds ?? [];
  const packagingRoutes = packagingRouteIds(values.packagingUomId, data);
  const productRoutes = productRouteIds(product, data);
  const acceptedRouteIds = new Set([
    ...activeRouteIds(valueRouteIds, data),
    ...packagingRoutes,
    ...productRoutes,
    ...warehouseIds.flatMap((warehouseId) => warehouseRouteIds(warehouseId, data)),
  ]);
  const chainIds = new Set(chain.map((location) => location.id));
  // (destination, route) -> warehouse ('' for none) -> the first rule in rule order.
  const rulesByDestinationAndRoute = new Map<string, Map<string, RoutingRule>>();

  for (const rule of [...data.rules].sort(compareRules)) {
    if (
      rule.action === 'PUSH' ||
      !chainIds.has(rule.locationDestId) ||
      (warehouseIds.length > 0 && rule.warehouseId !== null && !warehouseIds.includes(rule.warehouseId)) ||
      (acceptedRouteIds.size > 0 && !acceptedRouteIds.has(rule.routeId))
    ) {
      continue;
    }
    const key = `${rule.locationDestId}|${rule.routeId}`;
    const byWarehouse = rulesByDestinationAndRoute.get(key) ?? new Map<string, RoutingRule>();

    if (!byWarehouse.has(rule.warehouseId ?? '')) {
      byWarehouse.set(rule.warehouseId ?? '', rule);
    }
    rulesByDestinationAndRoute.set(key, byWarehouse);
  }

  // Inside a route: the warehouse's own rule, else the rule with no warehouse;
  // with no warehouse known, the route's first rule.
  const ruleOfRoutes = (routeIds: string[], warehouseId: string | null, destinationId: string) => {
    for (const route of orderRoutes(routeIds, product, data)) {
      const byWarehouse = rulesByDestinationAndRoute.get(`${destinationId}|${route.id}`);

      if (byWarehouse === undefined) {
        continue;
      }
      const rule =
        warehouseId === null ? byWarehouse.values().next().value : (byWarehouse.get(warehouseId) ?? byWarehouse.get(''));

      if (rule !== undefined) {
        return rule;
      }
    }

    return null;
  };

  for (const location of chain) {
    const warehouseId = isWarehouseGiven ? (values.warehouseId ?? null) : location.warehouseId;
    const rule =
      (valueRouteIds.length > 0 ? ruleOfRoutes(valueRouteIds, warehouseId, location.id) : null) ??
      ruleOfRoutes(packagingRoutes, warehouseId, location.id) ??
      ruleOfRoutes(productRoutes, warehouseId, location.id) ??
      (warehouseId === null ? null : ruleOfRoutes(warehouseRouteIds(warehouseId, data), warehouseId, location.id));

    if (rule !== null) {
      return rule;
    }
  }

  return null;
};
