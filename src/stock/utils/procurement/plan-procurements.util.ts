import { floatRound } from 'src/shared/utils/float-round.util';
import { planProcurementQuantities } from 'src/stock/utils/procurement/plan-procurement-quantities.util';
import { effectiveDestination, planPullMove } from 'src/stock/utils/procurement/plan-pull-move.util';
import { selectPullRule } from 'src/stock/utils/procurement/select-pull-rule.util';
import { type ConfirmingMove } from 'src/stock/utils/procurement/types/confirming-move.type';
import { type PlanProcurementsResult } from 'src/stock/utils/procurement/types/plan-procurements-result.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

export const NO_RULE_MESSAGE =
  'No rule has been found to replenish "{product}" in "{location}".\nVerify the routes configuration on the product.';
export const LOOP_MESSAGE = "Invalid rule's configuration, the following rule causes an endless loop: {rule}";
export const NO_SOURCE_MESSAGE = 'No source location defined on stock rule: {rule}!';
export const NO_PRODUCT_MESSAGE = 'Product {product} was not found.';

// Out of transit, a move names the warehouse it goes to as its partner.
const partnerOf = (move: ConfirmingMove, data: RoutingData, context: ProcurementContext) => {
  if (move.locationId !== context.internalTransitLocationId) {
    return move.partner;
  }
  const warehouseId = move.locationDestId === null ? null : (data.locations.get(move.locationDestId)?.warehouseId ?? null);

  return { companyId: warehouseId === null ? null : (context.warehousePartnerIds.get(warehouseId) ?? null), personId: null };
};

// A move from outside any warehouse is supplied by the warehouse its rule's route names.
const warehouseOf = (move: ConfirmingMove, data: RoutingData, context: ProcurementContext) => {
  if ((data.locations.get(move.locationId)?.warehouseId ?? null) === null) {
    return move.ruleRouteSupplierWhId;
  }

  return move.warehouseId ?? (move.pickingTypeId === null ? null : (context.pickingTypes.get(move.pickingTypeId)?.warehouseId ?? null));
};

// What confirming the moves asks of the rules: a full procurement for a
// trigger-another-rule move, the shortfall for a take-from-stock-else-order
// rule; nothing for a move already fed by other moves.
export const planMoveProcurements = (
  moves: ConfirmingMove[],
  data: RoutingData,
  context: ProcurementContext,
  consumed: Map<string, number>,
): { move: ConfirmingMove; procurement: Procurement }[] => {
  const needing = moves.filter(
    (move) => !move.hasOrigins && (move.procureMethod === 'MAKE_TO_ORDER' || move.ruleProcureMethod === 'MTS_ELSE_MTO'),
  );
  const quantities = planProcurementQuantities(needing, data, context, consumed);

  return needing.map((move, index) => {
    const firstReferenceName = move.referenceIds.length > 0 ? (context.referenceNames.get(move.referenceIds[0]) ?? null) : null;
    const isRuleOrdering = move.ruleProcureMethod === 'MAKE_TO_ORDER' || move.ruleProcureMethod === 'MTS_ELSE_MTO';

    return {
      move,
      procurement: {
        productId: move.productId,
        productQty: quantities[index],
        productUomId: move.productUomId,
        locationId: move.locationId,
        name: move.ruleName ?? '/',
        origin: firstReferenceName ?? move.origin ?? move.pickingName,
        values: {
          datePlanned: move.date,
          dateDeadline: move.dateDeadline,
          moveDests: move.procureMethod === 'MAKE_TO_ORDER' ? [move.ref] : [],
          partner: isRuleOrdering ? partnerOf(move, data, context) : null,
          routeIds: move.routeIds.length > 0 ? move.routeIds : move.resultPackageTypeRouteIds,
          warehouseId: warehouseOf(move, data, context),
          priority: move.priority,
          referenceIds: move.referenceIds,
          orderpointId: move.orderpointId,
          packagingUomId: move.packagingUomId,
        },
      },
    };
  });
};

type LevelItem = { procurement: Procurement; upstreamRuleIds: string[] };
type SourcedRule = RoutingRule & { locationSrcId: string };

const hasSource = (rule: RoutingRule): rule is SourcedRule => rule.locationSrcId !== null;

// Plans every move a set of procurements makes, down the whole chain of
// trigger-another-rule rules, before anything is written. A level with an
// error plans nothing further: the caller writes nothing at all then.
export const planProcurements = (
  procurements: Procurement[],
  data: RoutingData,
  context: ProcurementContext,
  consumed: Map<string, number> = new Map(),
): PlanProcurementsResult => {
  const result: PlanProcurementsResult = { moves: [], partnerUpdates: [], errors: [] };
  let counter = 0;

  const runLevel = (level: LevelItem[]) => {
    const toPull: { item: LevelItem; rule: SourcedRule }[] = [];
    const levelErrors: TranslatableText[] = [];

    for (const item of level) {
      const { procurement } = item;
      const product = context.products.get(procurement.productId);

      if (product === undefined) {
        levelErrors.push({ message: NO_PRODUCT_MESSAGE, values: { product: procurement.productId } });
        continue;
      }
      if (product.productType !== 'CONSU' || floatRound(procurement.productQty, 10 ** -context.digits) === 0) {
        continue;
      }
      const rule = selectPullRule(
        {
          product,
          locationId: procurement.locationId,
          values: {
            routeIds: procurement.values.routeIds,
            warehouseId: procurement.values.warehouseId,
            packagingUomId: procurement.values.packagingUomId,
          },
        },
        data,
      );

      if (rule === null) {
        levelErrors.push({
          message: NO_RULE_MESSAGE,
          values: { product: product.name, location: data.locations.get(procurement.locationId)?.completeName ?? '' },
        });
        continue;
      }
      if (item.upstreamRuleIds.includes(rule.id)) {
        levelErrors.push({ message: LOOP_MESSAGE, values: { rule: rule.name } });
        continue;
      }
      if (!hasSource(rule)) {
        levelErrors.push({ message: NO_SOURCE_MESSAGE, values: { rule: rule.name } });
        continue;
      }
      toPull.push({ item, rule });
    }

    if (levelErrors.length > 0) {
      result.errors.push(...levelErrors);
      return;
    }

    // Quantities that are not positive go first.
    const ordered = [...toPull].sort(
      (left, right) => Number(left.item.procurement.productQty > 0) - Number(right.item.procurement.productQty > 0),
    );
    const created = ordered.map(({ item, rule }) => {
      counter += 1;
      const { move, partnerUpdates } = planPullMove(
        { procurement: item.procurement, rule, key: `planned-${counter}`, planned: result.moves },
        data,
        context,
      );

      for (const update of partnerUpdates) {
        const target = update.move;
        const plannedTarget = target.kind === 'planned' ? result.moves.find((candidate) => candidate.key === target.key) : undefined;

        if (plannedTarget === undefined) {
          result.partnerUpdates.push(update);
        } else {
          plannedTarget.companyId = update.companyId;
          plannedTarget.personId = null;
        }
      }
      result.moves.push(move);

      return { move, rule, item };
    });
    const confirming: ConfirmingMove[] = created.map(({ move, rule }) => ({
      ref: { kind: 'planned', key: move.key },
      productId: move.productId,
      productUomId: move.productUomId,
      productUomQty: move.productUomQty,
      locationId: move.locationId,
      locationDestId: effectiveDestination(move, data, context),
      date: move.date,
      dateDeadline: move.dateDeadline,
      priority: move.priority,
      procureMethod: move.procureMethod,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleProcureMethod: rule.procureMethod,
      ruleRouteSupplierWhId: data.routes.get(rule.routeId)?.supplierWhId ?? null,
      hasOrigins: false,
      warehouseId: move.warehouseId,
      pickingTypeId: move.pickingTypeId,
      routeIds: move.routeIds,
      resultPackageTypeRouteIds: [],
      referenceIds: move.referenceIds,
      origin: move.origin,
      pickingName: null,
      orderpointId: move.orderpointId,
      // A new move's packaging is its own unit.
      packagingUomId: move.productUomId,
      partner: { companyId: move.companyId, personId: move.personId },
    }));
    const parentByKey = new Map(created.map((entry) => [entry.move.key, entry]));
    const children = planMoveProcurements(confirming, data, context, consumed).flatMap(({ move, procurement }) => {
      const parent = move.ref.kind === 'planned' ? parentByKey.get(move.ref.key) : undefined;

      return parent === undefined ? [] : [{ procurement, upstreamRuleIds: [...parent.item.upstreamRuleIds, parent.rule.id] }];
    });

    if (children.length > 0) {
      runLevel(children);
    }
  };

  runLevel(procurements.map((procurement) => ({ procurement, upstreamRuleIds: [] })));

  return result;
};
