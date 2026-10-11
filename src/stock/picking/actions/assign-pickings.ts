import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { confirmPickings } from 'src/stock/picking/actions/confirm-pickings';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings } from 'src/stock/stock-records';
import { MOVE_ROW, PICKING_ROW } from 'src/stock/stock-rows';
import { sortMovesForAssign } from 'src/stock/utils/check-availability.util';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

const OPEN_MOVE_STATES = [MOVE_STATE.WAITING, MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE, MOVE_STATE.ASSIGNED];

export const assignPickings = async (pickingIds: string[]) => {
  const ids = [...new Set(pickingIds)];
  const pickings = await stockPickings.find<PickingRow>({ id: { in: ids } }, PICKING_ROW);
  const drafts = pickings.filter((picking) => picking.state === PICKING_STATE.DRAFT).map((picking) => picking.id);

  if (drafts.length > 0) {
    await confirmPickings(drafts);
  }

  const moves = await stockMoves.find<MoveRow>({ pickingId: { in: ids }, state: { in: OPEN_MOVE_STATES } }, MOVE_ROW);

  if (moves.length === 0) {
    throw new StockUserError('Nothing to check the availability for.');
  }

  await assignMoves(sortMovesForAssign(moves).map((move) => move.id));
  await recomputePickingState(ids);
};
