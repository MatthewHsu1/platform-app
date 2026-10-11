import { findMany } from 'src/shared/triggers/records';
import { emptyProcurementWrites, procurementWrites, runPlannedProcurements } from 'src/stock/procurement/apply-procurement-plan';
import { PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { readProcurementContext } from 'src/stock/procurement/read-procurement-context';
import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import {
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockReferenceMoveRels,
  stockReferences,
  stockRouteMoves,
  stockRoutes,
  stockRules,
} from 'src/stock/routing-records';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { orderByCreation } from 'src/stock/utils/procurement/order-by-creation.util';
import { planMoveProcurements, planProcurements } from 'src/stock/utils/procurement/plan-procurements.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';
import { type ConfirmingMove } from 'src/stock/utils/procurement/types/confirming-move.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';

type StoredMove = {
  id: string;
  state: MoveState;
  productId: string;
  productUomId: string | null;
  productUomQty: number | null;
  locationId: string | null;
  locationDestId: string | null;
  date: string | null;
  dateDeadline: string | null;
  priority: Priority | null;
  procureMethod: ProcureMethod;
  ruleId: string | null;
  warehouseId: string | null;
  pickingTypeId: string | null;
  pickingId: string | null;
  origin: string | null;
  procurementRun: string | null;
  companyId: string | null;
  personId: string | null;
  packagingUomId: string | null;
  orderpointId: string | null;
};

const MOVE_SELECTION =
  'id state productId productUomId productUomQty locationId locationDestId date dateDeadline priority procureMethod ruleId warehouseId pickingTypeId pickingId origin procurementRun companyId personId packagingUomId orderpointId';

// Moves a procurement run made were planned with it, so they ask nothing. The
// moves are taken in the order the caller gives, which decides who gets the
// free stock first.
const planConfirmProcurements = async (moveIds: string[], runId: string): Promise<ProcurementWritePlan> => {
  const order = [...new Set(moveIds)];
  const stored = (await stockMoves.find<StoredMove>({ id: { in: order } }, MOVE_SELECTION)).sort(
    (left, right) => order.indexOf(left.id) - order.indexOf(right.id),
  );
  const moves = stored.filter(
    (move): move is StoredMove & { productUomId: string; locationId: string } =>
      move.state === MOVE_STATE.DRAFT &&
      move.procurementRun === null &&
      move.productUomId !== null &&
      move.locationId !== null,
  );

  if (moves.length === 0) {
    return emptyProcurementWrites(runId);
  }
  const ids = moves.map((move) => move.id);
  const { origins, routeLinks, referenceLinks, rules, pickings } = await findMany<{
    origins: { moveDestId: string }[];
    routeLinks: { stockMoveId: string; stockRouteId: string }[];
    referenceLinks: { moveId: string; referenceId: string }[];
    rules: { id: string; name: string | null; procureMethod: RuleProcureMethod; routeId: string }[];
    pickings: { id: string; name: string | null }[];
  }>({
    origins: { of: stockMoveMoveRels, filter: { moveDestId: { in: ids } }, selection: 'moveDestId' },
    routeLinks: { of: stockRouteMoves, filter: { stockMoveId: { in: ids } }, selection: 'stockMoveId stockRouteId' },
    referenceLinks: { of: stockReferenceMoveRels, filter: { moveId: { in: ids } }, selection: 'moveId referenceId' },
    rules: {
      of: stockRules,
      filter: { id: { in: [...new Set(moves.flatMap((move) => move.ruleId ?? []))] } },
      selection: 'id name procureMethod routeId',
    },
    pickings: {
      of: stockPickings,
      filter: { id: { in: [...new Set(moves.flatMap((move) => move.pickingId ?? []))] } },
      selection: 'id name',
    },
  });
  const routes = await stockRoutes.find<{ id: string; supplierWhId: string | null }>(
    { id: { in: [...new Set(rules.map((rule) => rule.routeId))] } },
    'id supplierWhId',
  );
  // The origin of a procurement is the name of the move's first reference, the one made first.
  const references = await stockReferences.find<{ id: string; createdAt: string }>(
    { id: { in: [...new Set(referenceLinks.map((link) => link.referenceId))] } },
    'id createdAt',
  );
  const { data, products } = await readRoutingData([...new Set(moves.map((move) => move.productId))]);
  const context = await readProcurementContext({
    runId,
    products,
    existingMoveIds: ids,
    referenceIds: referenceLinks.map((link) => link.referenceId),
  });
  const confirming: ConfirmingMove[] = moves.map((move) => {
    const rule = rules.find((candidate) => candidate.id === move.ruleId);

    return {
      ref: { kind: 'existing', id: move.id },
      productId: move.productId,
      productUomId: move.productUomId,
      productUomQty: move.productUomQty ?? 0,
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      date: move.date ?? context.now,
      dateDeadline: move.dateDeadline,
      priority: move.priority ?? 'NORMAL',
      procureMethod: move.procureMethod,
      ruleId: move.ruleId,
      ruleName: rule?.name ?? null,
      ruleProcureMethod: rule?.procureMethod ?? null,
      ruleRouteSupplierWhId: routes.find((route) => route.id === rule?.routeId)?.supplierWhId ?? null,
      hasOrigins: origins.some((origin) => origin.moveDestId === move.id),
      warehouseId: move.warehouseId,
      pickingTypeId: move.pickingTypeId,
      routeIds: routeLinks.filter((link) => link.stockMoveId === move.id).map((link) => link.stockRouteId),
      resultPackageTypeRouteIds: [],
      referenceIds: orderByCreation(
        referenceLinks.filter((link) => link.moveId === move.id).map((link) => link.referenceId),
        references,
      ),
      origin: move.origin,
      pickingName: pickings.find((picking) => picking.id === move.pickingId)?.name ?? null,
      orderpointId: move.orderpointId,
      packagingUomId: move.packagingUomId,
      partner: { companyId: move.companyId, personId: move.personId },
    };
  });
  const consumed = new Map<string, number>();
  const procurements = planMoveProcurements(confirming, data, context, consumed).map((entry) => entry.procurement);

  return procurementWrites(planProcurements(procurements, data, context, consumed), data, context);
};

// Confirming moves asks the rules for what they need: a make-to-order move
// for its whole demand, a take-from-stock-else-order move for the part free
// stock does not cover. Errors refuse the confirm before anything is written;
// `onCommit` (the claim journal's commit point) runs once the plan holds. Under
// the confirm's journal the plan is stored, so a resumed confirm replays it.
export const procurementsForConfirm = async (
  moveIds: string[],
  { runId, onCommit, journal }: { runId?: string; onCommit?: () => Promise<void>; journal?: ClaimJournal } = {},
): Promise<void> => {
  await runPlannedProcurements({
    plan: (id) => planConfirmProcurements(moveIds, id),
    runId: runId ?? journal?.runId ?? crypto.randomUUID(),
    api: PROCUREMENT_WRITE_API,
    journal,
    stepPrefix: 'confirm:procurement',
    onCommit,
  });
};
