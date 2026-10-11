import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { rollupMoves } from 'src/stock/utils/rollup-moves.util';

const SKIPPED_STATES: Record<'reserve' | 'unreserve', string[]> = {
  reserve: [MOVE_STATE.DRAFT, MOVE_STATE.CANCEL, MOVE_STATE.ASSIGNED, MOVE_STATE.DONE],
  unreserve: [MOVE_STATE.DRAFT, MOVE_STATE.CANCEL, MOVE_STATE.DONE],
};

// A delivery and every move chained before it that Reserve or Unreserve can
// still act on, the delivery first.
export const linkedMovesFor = ({
  moveId,
  moves,
  action,
}: {
  moveId: string;
  moves: { id: string; state: string; moveOrigIds: string[] }[];
  action: 'reserve' | 'unreserve';
}) => {
  const byId = new Map(moves.map((move) => [move.id, move]));

  return rollupMoves([moveId], (id) => byId.get(id)?.moveOrigIds ?? []).filter((id) => {
    const move = byId.get(id);

    return move !== undefined && !SKIPPED_STATES[action].includes(move.state);
  });
};
