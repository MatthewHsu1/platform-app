import { graphqlDoneMovesStore } from 'src/stock/move/actions/done-moves-store';
import { MOVE_SPLIT_MESSAGES } from 'src/stock/move/move-split-messages.constant';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines } from 'src/stock/stock-records';
import { planSplitMove } from 'src/stock/utils/plan-split-move.util';

// Reads only. A new move for `quantity` (product unit) of the move's demand,
// in the move's own state; `lineIds` go to it, and `pickingId` (when given)
// is its transfer. The move keeps the rest of its demand.
export const planMoveSplit = async (
  moveId: string,
  quantity: number,
  target: { lineIds?: string[]; pickingId?: string; newMoveId?: string } = {},
): Promise<MoveSplitPlan> => {
  const store = graphqlDoneMovesStore;
  const [move] = await store.readMoves([moveId]);

  if (move === undefined) {
    throw new Error(`Move ${moveId} not found.`);
  }
  if (move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL) {
    throw new StockUserError(MOVE_SPLIT_MESSAGES.closed);
  }
  if (move.state === MOVE_STATE.DRAFT) {
    throw new StockUserError(MOVE_SPLIT_MESSAGES.draft);
  }
  const split = planSplitMove({
    productQty: move.productQty,
    quantity,
    moveUomId: move.productUomId,
    productUomId: move.productUnitUomId,
    uoms: await store.uoms(),
    digits: store.digits(),
  });

  if (split === null) {
    throw new StockUserError(MOVE_SPLIT_MESSAGES.nothing);
  }

  return {
    moveId,
    state: move.state,
    productId: move.productId,
    newMoveId: target.newMoveId ?? store.newId(),
    newValues: {
      ...move.copyValues,
      ...(target.pickingId === undefined ? {} : { pickingId: target.pickingId }),
      productUomQty: split.newDemand,
      productUomId: split.newUomId,
    },
    moveOrigIds: move.moveOrigIds,
    moveDestIds: move.openMoveDestIds,
    referenceIds: move.referenceIds,
    originalDemand: split.originalDemand,
    lineIds: target.lineIds ?? [],
  };
};

// Running it again changes nothing: the new move is made only when missing,
// and every other write sets a planned value. The lines move before the moves
// are worked out again, so each move's state comes from the lines it holds.
export const applyMoveSplit = async (plan: MoveSplitPlan): Promise<string> => {
  const store = graphqlDoneMovesStore;

  await store.createSplitMoves([
    {
      id: plan.newMoveId,
      values: { ...plan.newValues, state: plan.state },
      moveOrigIds: plan.moveOrigIds,
      moveDestIds: plan.moveDestIds,
      referenceIds: plan.referenceIds,
    },
  ]);
  await stockMoveLines.updateMany(plan.lineIds, {
    moveId: plan.newMoveId,
    ...(typeof plan.newValues.pickingId === 'string' ? { pickingId: plan.newValues.pickingId } : {}),
  });
  await store.updateMoves([{ id: plan.moveId, data: { productUomQty: plan.originalDemand } }]);
  await store.recomputeMove([plan.moveId, plan.newMoveId]);
  await store.recomputeProductQuantities([plan.productId]);

  return plan.newMoveId;
};

// For a caller without a claim journal. The new move is not confirmed: it
// starts in the move's own state, holds no line, and the caller moves lines
// onto it. A caller that may run twice stores the plan of `planMoveSplit` and
// calls `applyMoveSplit` again with it: planning again would take the
// quantity off the move a second time.
export const splitMove = async (moveId: string, quantity: number, { newMoveId }: { newMoveId?: string } = {}): Promise<string> =>
  applyMoveSplit(await planMoveSplit(moveId, quantity, { newMoveId }));
