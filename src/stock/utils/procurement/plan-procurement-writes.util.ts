import { effectiveDestination } from 'src/stock/utils/procurement/plan-pull-move.util';
import { type MoveRef } from 'src/stock/utils/procurement/types/move-ref.type';
import { type PlanProcurementsResult } from 'src/stock/utils/procurement/types/plan-procurements-result.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';

// The rows a plan writes, each with an id chosen now. A new move gets its
// destination here, so confirming it never waits on a create trigger.
export const planProcurementWrites = (
  plan: PlanProcurementsResult,
  data: RoutingData,
  context: ProcurementContext,
  newId: () => string,
): ProcurementWritePlan => {
  const moves = plan.moves.map((move) => ({
    id: newId(),
    data: {
      productId: move.productId,
      productUomId: move.productUomId,
      packagingUomId: move.productUomId,
      productUomQty: move.productUomQty,
      date: move.date,
      dateDeadline: move.dateDeadline,
      locationId: move.locationId,
      locationDestId: effectiveDestination(move, data, context),
      locationFinalId: move.locationFinalId,
      ruleId: move.ruleId,
      pickingTypeId: move.pickingTypeId,
      warehouseId: move.warehouseId,
      propagateCancel: move.propagateCancel,
      procureMethod: move.procureMethod,
      companyId: move.companyId,
      personId: move.personId,
      priority: move.priority,
      origin: move.origin,
      procurementRun: move.procurementRun,
      orderpointId: move.orderpointId,
    },
  }));
  const idByKey = new Map(plan.moves.map((move, index) => [move.key, moves[index].id]));
  const idOf = (ref: MoveRef) => {
    if (ref.kind === 'existing') {
      return ref.id;
    }
    const id = idByKey.get(ref.key);

    if (id === undefined) {
      throw new Error(`The procurement plan names a move it does not hold: ${ref.key}`);
    }
    return id;
  };

  return {
    runId: context.runId,
    moves,
    moveLinks: plan.moves.flatMap((move, index) =>
      move.moveDests.map((destination) => ({ id: newId(), data: { moveOrigId: moves[index].id, moveDestId: idOf(destination) } })),
    ),
    routeLinks: plan.moves.flatMap((move, index) =>
      move.routeIds.map((stockRouteId) => ({ id: newId(), data: { stockMoveId: moves[index].id, stockRouteId } })),
    ),
    referenceLinks: plan.moves.flatMap((move, index) =>
      move.referenceIds.map((referenceId) => ({ id: newId(), data: { moveId: moves[index].id, referenceId } })),
    ),
    partnerUpdates: plan.partnerUpdates.map((update) => ({ moveId: idOf(update.move), companyId: update.companyId })),
  };
};
