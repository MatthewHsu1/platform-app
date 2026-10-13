import { type RoutingDraft } from 'src/stock/utils/types/routing-draft.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type WarehouseRoutingInput } from 'src/stock/utils/types/warehouse-routing-input.type';

type RuleKey = Pick<RuleRow, 'pickingTypeId' | 'locationSrcId' | 'locationDestId' | 'routeId' | 'action'>;

export const sameRuleKey = (rule: RuleRow, wanted: RuleKey) =>
  rule.pickingTypeId === wanted.pickingTypeId &&
  rule.locationSrcId === wanted.locationSrcId &&
  rule.locationDestId === wanted.locationDestId &&
  rule.routeId === wanted.routeId &&
  rule.action === wanted.action;

export const ruleKeyRole = (key: RuleKey) =>
  `rule:${key.routeId}:${key.pickingTypeId}:${key.locationSrcId}:${key.locationDestId}:${key.action}`;

export const makeRoutingDraft = (input: WarehouseRoutingInput): RoutingDraft => {
  const routes = new Map(input.routes.map((route) => [route.id, { ...route, warehouseIds: [...route.warehouseIds] }]));
  const rules = new Map(input.rules.map((rule) => [rule.id, { ...rule }]));
  const createdRouteIds = new Set<string>();
  const createdRuleIds = new Set<string>();

  const locationName = (id: string) => input.locations.get(id)?.name ?? '';
  const rulesOfRoute = (routeId: string) => [...rules.values()].filter((rule) => rule.routeId === routeId);
  // A role's id, unless a row the plan knows already holds it (a row staff
  // moved elsewhere, or an earlier rule of a kind made anew for each route).
  const freshId = (role: string) => {
    let id = input.newId(role);
    for (let copy = 1; routes.has(id) || rules.has(id); copy += 1) {
      id = input.newId(`${role}#${copy}`);
    }
    return id;
  };
  const putRule = (id: string, values: Omit<RuleRow, 'id'>) => {
    rules.set(id, { ...values, id });
    createdRuleIds.add(id);
    return id;
  };

  return {
    routes,
    rules,
    createdRouteIds,
    createdRuleIds,
    locationUpdates: [],
    ruleName: (code, from, to, suffix = '') =>
      `${code}: ${locationName(from)} → ${locationName(to)}${suffix === '' ? '' : ` (${suffix})`}`,
    rulesOfRoute,
    addRoute: (role, values) => {
      const id = freshId(role);
      routes.set(id, { ...values, id });
      createdRouteIds.add(id);
      return id;
    },
    addRule: (role, values) => putRule(freshId(role), values),
    addRuleOnce: (role, values) => {
      const id = input.newId(role);
      if (!rules.has(id)) {
        putRule(id, values);
      }
    },
    // Archiving or unarchiving a route carries its rules whose destination is active.
    setRouteActive: (routeId, active) => {
      const route = routes.get(routeId);
      if (route === undefined) {
        return;
      }
      route.active = active;
      for (const rule of rulesOfRoute(routeId)) {
        if (rule.locationDestId === null || input.locations.get(rule.locationDestId)?.active !== false) {
          rule.active = active;
        }
      }
    },
    mtoRuleValues: (owner, from, to, typeId) => ({
      name: `${owner.code}: ${locationName(from)} → ${locationName(to)} (MTO)`,
      active: true,
      action: 'PULL',
      routeId: input.mtoRouteId,
      locationSrcId: from,
      locationDestId: to,
      pickingTypeId: typeId,
      procureMethod: 'MAKE_TO_ORDER',
      warehouseId: owner.id,
      auto: 'MANUAL',
      propagateCancel: false,
      propagateCarrier: true,
      locationDestFromRule: false,
    }),
    isTransit: (locationId) => locationId !== null && input.locations.get(locationId)?.usage === 'TRANSIT',
  };
};
