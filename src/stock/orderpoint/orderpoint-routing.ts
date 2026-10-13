import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { stockRules } from 'src/stock/routing-records';
import { type RouteRuleCandidate } from 'src/stock/orderpoint/types/route-rule-candidate.type';
import { type RuleAction } from 'src/stock/types/rule-action.type';
import { LOOP_MESSAGE } from 'src/stock/utils/procurement/plan-procurements.util';
import { EndlessRuleLoopError, rulesFromLocation } from 'src/stock/utils/procurement/rules-from-location.util';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

type OrderpointRules =
  | { kind: 'rules'; product: RoutingProduct; rules: RoutingRule[] }
  | { kind: 'loop'; product: RoutingProduct; error: TranslatableText };

// The chain of rules that would supply each reordering rule. A product the
// routing data does not know (deleted meanwhile) is left out.
export const readOrderpointRules = async (
  requests: { orderpointId: string; productId: string; locationId: string; routeId: string | null }[],
) => {
  const { data, products } = await readRoutingData([...new Set(requests.map((request) => request.productId))]);
  const result = new Map<string, OrderpointRules>();

  for (const request of requests) {
    const product = products.get(request.productId);

    if (product === undefined) {
      continue;
    }
    try {
      result.set(request.orderpointId, {
        kind: 'rules',
        product,
        rules: rulesFromLocation(
          { product, locationId: request.locationId, routeIds: request.routeId === null ? [] : [request.routeId] },
          data,
        ),
      });
    } catch (error) {
      if (!(error instanceof EndlessRuleLoopError)) {
        throw error;
      }
      result.set(request.orderpointId, { kind: 'loop', product, error: { message: LOOP_MESSAGE, values: { rule: error.ruleName } } });
    }
  }

  return result;
};

// Active pull rules ending in these locations, with their route, for the
// default route.
export const readRouteRuleCandidates = async (locationIds: string[]): Promise<RouteRuleCandidate[]> => {
  const rows = await stockRules.find<{
    action: RuleAction;
    locationDestId: string;
    route: {
      id: string;
      sequence: number | null;
      createdAt: string;
      active: boolean | null;
      productSelectable: boolean | null;
      productCategSelectable: boolean | null;
    } | null;
  }>(
    { locationDestId: { in: locationIds }, active: { eq: true } },
    'action locationDestId route { id deletedAt sequence createdAt active productSelectable productCategSelectable }',
  );

  return rows.flatMap((row) =>
    row.route === null
      ? []
      : [
          {
            routeId: row.route.id,
            routeSequence: row.route.sequence ?? 0,
            routeCreatedAt: row.route.createdAt,
            routeActive: row.route.active === true,
            productSelectable: row.route.productSelectable === true,
            productCategSelectable: row.route.productCategSelectable === true,
            locationDestId: row.locationDestId,
            action: row.action,
          },
        ],
  );
};
