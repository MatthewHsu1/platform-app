import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { stockMoves } from 'src/stock/stock-records';

export const unreservePickings = async (pickingIds: string[]) => {
  const moves = await stockMoves.find<{ id: string }>({ pickingId: { in: pickingIds } }, 'id');

  await unreserveMoves(moves.map((move) => move.id));
  await recomputePickingState(pickingIds);
};
