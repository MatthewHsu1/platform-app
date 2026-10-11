import { ruleKeyRole } from 'src/stock/utils/routing-draft.util';
import { type RoutingDraft } from 'src/stock/utils/types/routing-draft.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type SupplierWarehouse } from 'src/stock/utils/types/supplier-warehouse.type';
import { type WarehouseRoutingInput } from 'src/stock/utils/types/warehouse-routing-input.type';

type Leg = { from: string; to: string; typeId: string };

export const resupplyRouteRole = (supplierId: string) => `route:resupply:${supplierId}`;

const pullRule = (
  draft: RoutingDraft,
  owner: Pick<RoutingWarehouse, 'id' | 'code' | 'lotStockId'>,
  routeId: string,
  leg: Leg,
  locationDestFromRule = false,
): Omit<RuleRow, 'id'> => ({
  name: draft.ruleName(owner.code, leg.from, leg.to),
  active: true,
  action: 'PULL',
  routeId,
  locationSrcId: leg.from,
  locationDestId: leg.to,
  pickingTypeId: leg.typeId,
  // The leg that leaves a warehouse's own stock takes from stock.
  procureMethod: leg.from === owner.lotStockId ? 'MAKE_TO_STOCK' : 'MAKE_TO_ORDER',
  warehouseId: owner.id,
  auto: 'MANUAL',
  propagateCancel: false,
  propagateCarrier: false,
  locationDestFromRule,
});

// The routes that resupply other warehouses from this one follow its delivery
// steps when it goes to or from shipping in one step.
export const planDeliveryResupply = (draft: RoutingDraft, input: WarehouseRoutingInput, toMultiStep: boolean) => {
  const { warehouse } = input;
  const { rules } = draft;
  const newOutput = warehouse.deliverySteps === 'SHIP_ONLY' ? warehouse.lotStockId : warehouse.whOutputStockLocId;
  const suppliedRouteIds = [...draft.routes.values()]
    .filter((route) => route.active && route.supplierWhId === warehouse.id)
    .map((route) => route.id);
  const inRoutes = (rule: RuleRow) => rule.routeId !== null && suppliedRouteIds.includes(rule.routeId) && rule.action !== 'PUSH';
  const toTransit = [...rules.values()].filter((rule) => rule.active && inRoutes(rule) && draft.isTransit(rule.locationDestId));

  for (const rule of toTransit) {
    rule.locationSrcId = newOutput;
    rule.procureMethod = toMultiStep ? 'MAKE_TO_ORDER' : 'MAKE_TO_STOCK';
  }
  const pickToOutput = (rule: RuleRow) =>
    inRoutes(rule) && rule.locationDestId === warehouse.whOutputStockLocId && rule.pickingTypeId === warehouse.pickTypeId;

  if (!toMultiStep) {
    [...rules.values()]
      .filter((rule) => rule.active && pickToOutput(rule))
      .forEach((rule) => {
        rule.active = false;
      });
    if (input.mtoRouteId === null) {
      return;
    }
    // A new make-to-order rule each time; the one archived when the warehouse went
    // multi-step stays archived. The request's name in the id makes it once per request.
    for (const destinationId of new Set(toTransit.map((rule) => rule.locationDestId as string))) {
      const values = draft.mtoRuleValues(warehouse, warehouse.lotStockId, destinationId, warehouse.outTypeId);
      const { requestId } = input.change;

      if (requestId === undefined) {
        draft.addRule(`rule:transitMto:${destinationId}`, values);
      } else {
        draft.addRuleOnce(`rule:transitMto:${destinationId}:${requestId}`, values);
      }
    }
    return;
  }
  const reopened = [...rules.values()].filter(pickToOutput);
  reopened.forEach((rule) => {
    rule.active = true;
  });
  for (const routeId of suppliedRouteIds.filter((id) => !reopened.some((rule) => rule.routeId === id))) {
    const values = pullRule(draft, warehouse, routeId, { from: warehouse.lotStockId, to: newOutput, typeId: warehouse.pickTypeId });
    draft.addRule(ruleKeyRole(values), values);
  }
  // Left active, a Stock → transit make-to-order rule would skip the pick to Output.
  [...rules.values()]
    .filter(
      (rule) =>
        rule.active &&
        rule.routeId === input.mtoRouteId &&
        rule.action !== 'PUSH' &&
        rule.locationSrcId === warehouse.lotStockId &&
        draft.isTransit(rule.locationDestId),
    )
    .forEach((rule) => {
      rule.active = false;
    });
};

const addResupplyRules = (draft: RoutingDraft, input: WarehouseRoutingInput, supplier: SupplierWarehouse, routeId: string, transitId: string) => {
  const { warehouse } = input;
  if (input.locations.get(transitId)?.active === false && !draft.locationUpdates.some((update) => update.id === transitId)) {
    draft.locationUpdates.push({ id: transitId, values: { active: true } });
  }
  const isSupplierOneStep = supplier.deliverySteps === 'SHIP_ONLY';
  const output = isSupplierOneStep ? supplier.lotStockId : supplier.whOutputStockLocId;

  // A multi-step supplier already has its Stock → Output pick in the make-to-order chain.
  if (isSupplierOneStep && input.mtoRouteId !== null) {
    draft.addRule(`rule:resupplyMto:${supplier.id}`, draft.mtoRuleValues(supplier, output, transitId, supplier.outTypeId));
  }
  const legs: [Pick<RoutingWarehouse, 'id' | 'code' | 'lotStockId'>, Leg, boolean][] = [
    [supplier, { from: output, to: transitId, typeId: supplier.outTypeId }, true],
    ...(isSupplierOneStep
      ? []
      : [[supplier, { from: supplier.lotStockId, to: output, typeId: supplier.pickTypeId }, false] as [SupplierWarehouse, Leg, boolean]]),
    [warehouse, { from: transitId, to: warehouse.lotStockId, typeId: warehouse.inTypeId }, false],
  ];
  for (const [owner, leg, locationDestFromRule] of legs) {
    const values = pullRule(draft, owner, routeId, leg, locationDestFromRule);
    draft.addRule(ruleKeyRole(values), values);
  }
};

const resupplyRoutes = (draft: RoutingDraft, input: WarehouseRoutingInput, supplierId: string) =>
  [...draft.routes.values()].filter((route) => route.suppliedWhId === input.warehouse.id && route.supplierWhId === supplierId);

// A supplier added again brings back its archived routes; a new one gets a route.
export const planResupplyAdded = (draft: RoutingDraft, input: WarehouseRoutingInput) => {
  const { warehouse } = input;
  const transitId = input.transitLocationId;

  for (const supplierId of input.change.resupplyAdded ?? []) {
    const known = resupplyRoutes(draft, input, supplierId);
    const supplier = input.suppliers.get(supplierId);
    // The route and its rules are written apart: a route this warehouse made
    // that has no rule yet is from a run that stopped between the two.
    const cutShort = known.find(
      (route) => route.id === input.newId(resupplyRouteRole(supplierId)) && draft.rulesOfRoute(route.id).length === 0,
    );
    const archived = known.filter((route) => !route.active);

    if (cutShort !== undefined && supplier !== undefined && transitId !== null) {
      addResupplyRules(draft, input, supplier, cutShort.id, transitId);
    } else if (archived.length > 0) {
      archived.forEach((route) => draft.setRouteActive(route.id, true));
    } else if (known.length === 0 && supplier !== undefined && transitId !== null) {
      const routeId = draft.addRoute(resupplyRouteRole(supplierId), {
        name: `${warehouse.name}: Supply Product from ${supplier.name}`,
        active: true,
        sequence: 0,
        productSelectable: true,
        productCategSelectable: true,
        warehouseSelectable: true,
        suppliedWhId: warehouse.id,
        supplierWhId: supplier.id,
        warehouseIds: [],
      });
      addResupplyRules(draft, input, supplier, routeId, transitId);
    }
  }
};

export const planResupplyRemoved = (draft: RoutingDraft, input: WarehouseRoutingInput) => {
  for (const supplierId of input.change.resupplyRemoved ?? []) {
    resupplyRoutes(draft, input, supplierId)
      .filter((route) => route.active)
      .forEach((route) => draft.setRouteActive(route.id, false));
  }
};
