import { matchesPushFilter } from 'src/stock/rule/push-filter';
import { PRIORITY, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { isRoutingLocationUnder, routingLocationBypassesReservation } from 'src/stock/utils/procurement/location-chain.util';
import { shiftDays } from 'src/stock/utils/procurement/plan-pull-move.util';
import { selectPushRule } from 'src/stock/utils/procurement/select-push-rule.util';
import { type PushMove } from 'src/stock/utils/procurement/types/push-move.type';
import { type PushPlan } from 'src/stock/utils/procurement/types/push-plan.type';
import { type PushedMoveValues } from 'src/stock/utils/procurement/types/pushed-move-values.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

// No push for a count, or when the next step already starts in this destination.
export const skipsPush = (move: PushMove, data: RoutingData) => {
  if (move.isInventory) {
    return true;
  }
  const destination = data.locations.get(move.locationDestId);

  return move.moveDests.some((downstream) => {
    const source = data.locations.get(downstream.locationId);

    return isRoutingLocationUnder(source, destination) || isRoutingLocationUnder(destination, source);
  });
};

const findPushRule = (move: PushMove, product: RoutingProduct, data: RoutingData): RoutingRule | null => {
  const values = {
    routeIds: [...new Set([...move.routeIds, ...move.resultPackageTypeRouteIds])],
    warehouseId: move.warehouseId ?? move.pickingTypeWarehouseId,
    packagingUomId: move.packagingUomId,
  };
  const excludedRuleIds: string[] = [];

  for (;;) {
    const rule = selectPushRule({ product, locationDestId: move.locationDestId, values, excludedRuleIds }, data);

    if (rule === null || matchesPushFilter(rule.pushDomain, move.filterRecord)) {
      return rule;
    }
    excludedRuleIds.push(rule.id);
  }
};

// Downstream moves that start outside the destination are no longer fed by this move.
export const linksToCut = (move: PushMove, data: RoutingData) =>
  move.moveDests
    .filter((downstream) => !isRoutingLocationUnder(data.locations.get(downstream.locationId), data.locations.get(move.locationDestId)))
    .map((downstream) => downstream.id);

// The move a manual rule makes after a done move, and whether the done move feeds it.
export const pushedMove = (move: PushMove, rule: RoutingRule, product: RoutingProduct, data: RoutingData) => {
  const final = move.locationFinalId === null ? undefined : data.locations.get(move.locationFinalId);
  const ruleDestination = data.locations.get(rule.locationDestId);
  const locationDestId =
    final !== undefined && isRoutingLocationUnder(final, ruleDestination)
      ? final.id
      : move.partnerCustomerLocationId !== null && ruleDestination?.usage === 'CUSTOMER'
        ? move.partnerCustomerLocationId
        : rule.locationDestId;
  const keepsFinal = final !== undefined && !isRoutingLocationUnder(data.locations.get(move.locationDestId), final);
  const sourceSkipsReservation = routingLocationBypassesReservation(data.locations.get(move.locationDestId));
  const newMove: PushedMoveValues = {
    productId: move.productId,
    productUomId: move.productUomId,
    productUomQty: move.productUomQty < 0 ? move.productUomQty : move.quantity,
    origin: move.origin ?? move.pickingName ?? '/',
    locationId: move.locationDestId,
    locationDestId,
    locationFinalId: keepsFinal ? move.locationFinalId : null,
    ruleId: rule.id,
    date: shiftDays(move.date, rule.delay),
    dateDeadline: move.dateDeadline,
    pickingTypeId: rule.pickingTypeId,
    propagateCancel: rule.propagateCancel,
    warehouseId: rule.warehouseId ?? data.locations.get(move.locationDestId)?.warehouseId ?? null,
    // A non-storable product is never reserved, so its next step takes from stock too.
    procureMethod: sourceSkipsReservation || !product.isStorable ? PROCURE_METHOD.MAKE_TO_STOCK : PROCURE_METHOD.MAKE_TO_ORDER,
    companyId: move.companyId,
    personId: move.personId,
    // The new move has no transfer yet, so it starts at normal priority.
    priority: PRIORITY.NORMAL,
    restrictPartnerId: move.restrictPartnerId,
    descriptionPickingManual: move.descriptionPickingManual,
    sequence: move.sequence,
    packagingUomId: move.productUomId,
    referenceIds: move.referenceIds,
    routeIds: move.routeIds,
  };

  return { newMove, linkFromDone: !sourceSkipsReservation };
};

// `chained`: the move was just moved on by a rule with no step added, so its
// push goes on from the new destination without checking again whether to push.
export const planPush = (move: PushMove, product: RoutingProduct, data: RoutingData, { chained = false }: { chained?: boolean } = {}): PushPlan => {
  if (!chained && skipsPush(move, data)) {
    return { kind: 'skip' };
  }
  const rule = findPushRule(move, product, data);

  // A return is never pushed back to where its original move went.
  if (rule === null || (move.originReturnedMoveDestId !== null && move.originReturnedMoveDestId === rule.locationDestId)) {
    return { kind: 'none', breakLinks: linksToCut(move, data) };
  }
  // This push already made its move.
  if (!chained && move.moveDests.some((downstream) => downstream.ruleId === rule.id)) {
    return { kind: 'none', breakLinks: [] };
  }

  if (rule.auto === 'TRANSPARENT') {
    return {
      kind: 'transparent',
      ruleId: rule.id,
      date: shiftDays(move.date, rule.delay),
      locationDestId: rule.locationDestId,
      destinationChanged: rule.locationDestId !== move.locationDestId,
    };
  }

  const { newMove, linkFromDone } = pushedMove(move, rule, product, data);
  const atFinal = (downstream: PushMove['moveDests'][number]) =>
    move.locationFinalId !== null && downstream.locationId === move.locationFinalId;
  const relinkToNewMove = move.moveDests.filter(atFinal).map((downstream) => downstream.id);

  return {
    kind: 'manual',
    ruleId: rule.id,
    newMove,
    linkFromDone,
    relinkToNewMove,
    breakLinks: linksToCut(move, data).filter((id) => !relinkToNewMove.includes(id)),
  };
};
