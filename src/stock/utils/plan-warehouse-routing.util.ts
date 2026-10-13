import { type DeliverySteps } from 'src/stock/types/delivery-steps.type';
import { type ReceptionSteps } from 'src/stock/types/reception-steps.type';
import { planDeliveryResupply, planResupplyAdded, planResupplyRemoved } from 'src/stock/utils/plan-warehouse-resupply.util';
import { makeRoutingDraft, ruleKeyRole, sameRuleKey } from 'src/stock/utils/routing-draft.util';
import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type RoutingDraft } from 'src/stock/utils/types/routing-draft.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type WarehouseRoutingInput } from 'src/stock/utils/types/warehouse-routing-input.type';
import { type WarehouseRoutingPlan } from 'src/stock/utils/types/warehouse-routing-plan.type';

export const RECEPTION_ROUTE_LABELS: Record<ReceptionSteps, string> = {
  ONE_STEP: 'Receive in 1 step (stock)',
  TWO_STEPS: 'Receive in 2 steps (input + stock)',
  THREE_STEPS: 'Receive in 3 steps (input + quality + stock)',
};

export const DELIVERY_ROUTE_LABELS: Record<DeliverySteps, string> = {
  SHIP_ONLY: 'Deliver in 1 step (ship)',
  PICK_SHIP: 'Deliver in 2 steps (pick + ship)',
  PICK_PACK_SHIP: 'Deliver in 3 steps (pick + pack + ship)',
};

// Roles of the rows a warehouse points at; the reader finds a row a stopped run made by these.
export const WAREHOUSE_ROUTING_ROLES = {
  receptionRouteId: 'route:reception',
  deliveryRouteId: 'route:delivery',
  mtoPullId: 'rule:mtoPull',
} as const;

type Routing = { from: string; to: string; typeId: string; action: 'PULL' | 'PUSH' };

const receptionRoutings = (warehouse: RoutingWarehouse, vendorsId: string): Record<ReceptionSteps, Routing[]> => ({
  ONE_STEP: [{ from: vendorsId, to: warehouse.lotStockId, typeId: warehouse.inTypeId, action: 'PULL' }],
  TWO_STEPS: [
    { from: vendorsId, to: warehouse.lotStockId, typeId: warehouse.inTypeId, action: 'PULL' },
    { from: warehouse.whInputStockLocId, to: warehouse.lotStockId, typeId: warehouse.storeTypeId, action: 'PUSH' },
  ],
  THREE_STEPS: [
    { from: vendorsId, to: warehouse.lotStockId, typeId: warehouse.inTypeId, action: 'PULL' },
    { from: warehouse.whInputStockLocId, to: warehouse.whQcStockLocId, typeId: warehouse.qcTypeId, action: 'PUSH' },
    { from: warehouse.whQcStockLocId, to: warehouse.lotStockId, typeId: warehouse.storeTypeId, action: 'PUSH' },
  ],
});

const deliveryRoutings = (warehouse: RoutingWarehouse, customersId: string): Record<DeliverySteps, Routing[]> => ({
  SHIP_ONLY: [{ from: warehouse.lotStockId, to: customersId, typeId: warehouse.outTypeId, action: 'PULL' }],
  PICK_SHIP: [
    { from: warehouse.lotStockId, to: customersId, typeId: warehouse.pickTypeId, action: 'PULL' },
    { from: warehouse.whOutputStockLocId, to: customersId, typeId: warehouse.outTypeId, action: 'PUSH' },
  ],
  PICK_PACK_SHIP: [
    { from: warehouse.lotStockId, to: customersId, typeId: warehouse.pickTypeId, action: 'PULL' },
    { from: warehouse.whPackStockLocId, to: warehouse.whOutputStockLocId, typeId: warehouse.packTypeId, action: 'PUSH' },
    { from: warehouse.whOutputStockLocId, to: customersId, typeId: warehouse.outTypeId, action: 'PUSH' },
  ],
});

// Replaces the first old name by the new one. A name that already reads the new
// name there was renamed by an earlier run of the same request (the new name
// may hold the old one: "Chicago" → "Chicago North").
export const renameOnce = (text: string | null, oldName: string, newName: string) => {
  if (text === null) {
    return null;
  }
  const index = oldName === '' ? -1 : text.indexOf(oldName);
  const offset = newName.indexOf(oldName);

  if (index === -1 || (offset !== -1 && index >= offset && text.startsWith(newName, index - offset))) {
    return text;
  }
  return `${text.slice(0, index)}${newName}${text.slice(index + oldName.length)}`;
};

const changedValues = <TRow extends object>(original: TRow, current: TRow, keys: (keyof TRow)[]) =>
  Object.fromEntries(keys.filter((key) => original[key] !== current[key]).map((key) => [key, current[key]])) as Partial<TRow>;

const ROUTE_KEYS: (keyof RouteRow)[] = ['name', 'active'];
const RULE_KEYS: (keyof RuleRow)[] = ['name', 'active', 'locationSrcId', 'locationDestId', 'pickingTypeId', 'procureMethod'];

const toPlan = (input: WarehouseRoutingInput, draft: RoutingDraft, warehouseFields: WarehouseRoutingPlan['warehouseUpdates']): WarehouseRoutingPlan => {
  const { warehouse } = input;
  const { routes, rules, createdRouteIds, createdRuleIds } = draft;
  const originalRoutes = new Map(input.routes.map((route) => [route.id, route]));
  const originalRules = new Map(input.rules.map((rule) => [rule.id, rule]));

  return {
    routeCreates: [...createdRouteIds].map((id) => {
      const { warehouseIds, ...route } = routes.get(id)!;
      return { ...route, linkWarehouse: warehouseIds.includes(warehouse.id) };
    }),
    routeUpdates: [...routes.values()]
      .filter((route) => !createdRouteIds.has(route.id))
      .map((route) => ({ id: route.id, values: changedValues(originalRoutes.get(route.id)!, route, ROUTE_KEYS) }))
      .filter((update) => Object.keys(update.values).length > 0),
    routeWarehouseLinks: [...routes.values()]
      .filter(
        (route) =>
          !createdRouteIds.has(route.id) &&
          route.warehouseIds.includes(warehouse.id) &&
          !originalRoutes.get(route.id)!.warehouseIds.includes(warehouse.id),
      )
      .map((route) => ({ routeId: route.id, warehouseId: warehouse.id })),
    ruleCreates: [...createdRuleIds].map((id) => rules.get(id)!),
    ruleUpdates: [...rules.values()]
      .filter((rule) => !createdRuleIds.has(rule.id))
      .map((rule) => ({ id: rule.id, values: changedValues(originalRules.get(rule.id)!, rule, RULE_KEYS) }))
      .filter((update) => Object.keys(update.values).length > 0),
    warehouseUpdates: Object.fromEntries(
      (Object.keys(warehouseFields) as (keyof typeof warehouseFields)[])
        .filter((key) => warehouseFields[key] !== warehouse[key])
        .map((key) => [key, warehouseFields[key]]),
    ),
    locationUpdates: draft.locationUpdates,
  };
};

// The warehouse's routes and rules as its steps, name, active flag and resupply
// warehouses want them. Rules no longer wanted are archived, and an archived rule
// with the same operation type, locations, route and action is reused before a
// new one is made, so switching steps back and forth makes no new rows. A second
// run with nothing changed plans nothing, and so does a run that stopped half-way
// once it is run again with the same request.
export const planWarehouseRouting = (input: WarehouseRoutingInput): WarehouseRoutingPlan => {
  const { event, warehouse } = input;
  const before = input.change.before ?? null;
  const draft = makeRoutingDraft(input);
  const { routes, rules } = draft;
  const warehouseFields = {
    receptionRouteId: warehouse.receptionRouteId,
    deliveryRouteId: warehouse.deliveryRouteId,
    mtoPullId: warehouse.mtoPullId,
  };

  // Unarchive every archived rule with the same key, else make one.
  const findOrCreateRule = (values: Omit<RuleRow, 'id'>) => {
    const matches = [...rules.values()].filter((rule) => !rule.active && sameRuleKey(rule, values));

    if (matches.length === 0) {
      draft.addRule(ruleKeyRole(values), values);
      return;
    }
    matches.forEach((rule) => {
      rule.active = true;
    });
  };

  // Archived routes and rules are renamed too.
  const rename = (oldName: string) => {
    for (const route of [...routes.values()].filter((candidate) => candidate.warehouseIds.includes(warehouse.id))) {
      route.name = renameOnce(route.name, oldName, warehouse.name);
      for (const rule of draft.rulesOfRoute(route.id)) {
        rule.name = renameOnce(rule.name, oldName, warehouse.name);
      }
    }
    const mtoRule = warehouseFields.mtoPullId === null ? undefined : rules.get(warehouseFields.mtoPullId);
    if (mtoRule !== undefined) {
      mtoRule.name = renameOnce(mtoRule.name, oldName, warehouse.name);
    }
  };

  // Routes shared with another warehouse keep their flag.
  const applyActive = (active: boolean) => {
    for (const route of [...routes.values()].filter(
      (candidate) => candidate.warehouseIds.includes(warehouse.id) && candidate.warehouseIds.length === 1,
    )) {
      draft.setRouteActive(route.id, active);
    }
    for (const rule of [...rules.values()].filter((candidate) => candidate.warehouseId === warehouse.id)) {
      rule.active = active;
    }
  };

  const updateRoute = (kind: 'reception' | 'delivery') => {
    const field = kind === 'reception' ? 'receptionRouteId' : 'deliveryRouteId';
    const name =
      kind === 'reception'
        ? `${warehouse.name}: ${RECEPTION_ROUTE_LABELS[warehouse.receptionSteps]}`
        : `${warehouse.name}: ${DELIVERY_ROUTE_LABELS[warehouse.deliverySteps]}`;
    const existing = warehouseFields[field] === null ? undefined : routes.get(warehouseFields[field]);
    let routeId: string;

    if (existing !== undefined) {
      existing.name = name;
      existing.active = warehouse.active;
      draft.rulesOfRoute(existing.id).forEach((rule) => {
        rule.active = false;
      });
      routeId = existing.id;
    } else {
      routeId = draft.addRoute(WAREHOUSE_ROUTING_ROLES[field], {
        name,
        active: warehouse.active,
        sequence: kind === 'reception' ? 50 : 60,
        productSelectable: false,
        productCategSelectable: true,
        warehouseSelectable: true,
        suppliedWhId: null,
        supplierWhId: null,
        warehouseIds: [],
      });
      warehouseFields[field] = routeId;
    }
    const routings =
      kind === 'reception'
        ? receptionRoutings(warehouse, input.vendorsLocationId)[warehouse.receptionSteps]
        : deliveryRoutings(warehouse, input.customersLocationId)[warehouse.deliverySteps];

    routings.forEach((routing, index) =>
      findOrCreateRule({
        name: draft.ruleName(warehouse.code, routing.from, routing.to),
        active: true,
        action: routing.action,
        routeId,
        locationSrcId: routing.from,
        locationDestId: routing.to,
        pickingTypeId: routing.typeId,
        procureMethod: index === 0 ? 'MAKE_TO_STOCK' : 'MAKE_TO_ORDER',
        warehouseId: warehouse.id,
        auto: 'MANUAL',
        // A reception chain cancels forward, but never past its last step.
        propagateCancel: kind === 'reception' && index < routings.length - 1,
        propagateCarrier: kind === 'delivery',
        locationDestFromRule: false,
      }),
    );
    const route = routes.get(routeId)!;
    if (!route.warehouseIds.includes(warehouse.id)) {
      route.warehouseIds.push(warehouse.id);
    }
  };

  const updateMtoRule = () => {
    if (input.mtoRouteId === null) {
      return;
    }
    // The delivery routing that leaves Stock: the first one of every step setting.
    const [fromStock] = deliveryRoutings(warehouse, input.customersLocationId)[warehouse.deliverySteps];
    const values = draft.mtoRuleValues(warehouse, fromStock.from, fromStock.to, fromStock.typeId);
    const existing = warehouseFields.mtoPullId === null ? undefined : rules.get(warehouseFields.mtoPullId);

    if (existing !== undefined) {
      existing.name = values.name;
      existing.locationSrcId = values.locationSrcId;
      existing.locationDestId = values.locationDestId;
      existing.pickingTypeId = values.pickingTypeId;
      return;
    }
    warehouseFields.mtoPullId = draft.addRule(WAREHOUSE_ROUTING_ROLES.mtoPullId, values);
  };

  if (
    before !== null &&
    before.deliverySteps !== warehouse.deliverySteps &&
    (before.deliverySteps === 'SHIP_ONLY' || warehouse.deliverySteps === 'SHIP_ONLY')
  ) {
    planDeliveryResupply(draft, input, before.deliverySteps === 'SHIP_ONLY');
  }
  if (before !== null && before.name !== null && before.name !== warehouse.name) {
    rename(before.name);
  }
  if (event === 'archived' || event === 'unarchived') {
    applyActive(event === 'unarchived');
  }
  if (event !== 'archived') {
    // Routes and the make-to-order rule are rebuilt (and made when missing) only
    // when the warehouse is made or unarchived, or the steps change. A change of
    // either steps rebuilds both routes, so a missing one is made then too.
    const isFullRun = event === 'created' || event === 'unarchived';
    const receptionChanged = before !== null && before.receptionSteps !== warehouse.receptionSteps;
    const deliveryChanged = before !== null && before.deliverySteps !== warehouse.deliverySteps;

    if (isFullRun || receptionChanged || deliveryChanged) {
      updateRoute('reception');
      updateRoute('delivery');
    }
    if (isFullRun || deliveryChanged || input.change.refreshGlobalRules === true) {
      updateMtoRule();
    }
    planResupplyAdded(draft, input);
    planResupplyRemoved(draft, input);
  }

  return toPlan(input, draft, warehouseFields);
};
