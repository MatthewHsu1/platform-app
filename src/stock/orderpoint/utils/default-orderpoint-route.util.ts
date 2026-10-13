import { type RouteRuleCandidate } from 'src/stock/orderpoint/types/route-rule-candidate.type';

// The first route (by route sequence) listed on the product or its own
// category that has a pull rule ending in this exact location. The caller
// passes active rules only.
export const defaultOrderpointRoute = ({
  locationId,
  productRouteIds,
  categoryRouteIds,
  rules,
}: {
  locationId: string;
  productRouteIds: string[];
  categoryRouteIds: string[];
  rules: RouteRuleCandidate[];
}): string | null => {
  const listed = new Set([...productRouteIds, ...categoryRouteIds]);
  const match = rules
    .filter(
      (rule) =>
        rule.routeActive &&
        (rule.productSelectable || rule.productCategSelectable) &&
        rule.action !== 'PUSH' &&
        rule.locationDestId === locationId &&
        listed.has(rule.routeId),
    )
    .sort((left, right) => left.routeSequence - right.routeSequence || left.routeCreatedAt.localeCompare(right.routeCreatedAt))[0];

  return match?.routeId ?? null;
};
