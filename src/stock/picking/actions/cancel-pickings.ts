import { cancelMoves } from 'src/stock/move/actions/cancel-moves';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { planCancelPickings } from 'src/stock/utils/plan-cancel-pickings.util';
import { type PickingState } from 'src/stock/types/picking-state.type';

// Every step repeats safely (cancelMoves skips what is cancelled and refuses a
// done move before it writes), so a second click or a run after a stop ends the
// same way; no claim is needed.
export const cancelPickings = async (pickingIds: string[]) => {
  const pickings = await stockPickings.find<{ id: string; isLocked: boolean; state: PickingState }>(
    { id: { in: pickingIds } },
    'id isLocked state',
  );
  const moves = await stockMoves.find<{ id: string; pickingId: string | null }>(
    { pickingId: { in: pickingIds } },
    'id pickingId',
  );

  await cancelMoves(moves.map((move) => move.id));

  const plan = planCancelPickings({
    pickings: pickings.map((picking) => ({
      id: picking.id,
      isLocked: picking.isLocked,
      state: picking.state,
      moveCount: moves.filter((move) => move.pickingId === picking.id).length,
    })),
  });

  await stockPickings.updateMany(plan.lockIds, { isLocked: true });
  await recomputePickingState(plan.recomputeIds);
  await stockPickings.updateMany(plan.cancelEmptyIds, { state: PICKING_STATE.CANCEL });
};
