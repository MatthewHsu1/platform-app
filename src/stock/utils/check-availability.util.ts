import { MOVE_STATE, PICKING_STATE, PRIORITY } from 'src/stock/stock-options.constant';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type Priority } from 'src/stock/types/priority.type';

const SHOWN_STATES: PickingState[] = [PICKING_STATE.CONFIRMED, PICKING_STATE.WAITING, PICKING_STATE.ASSIGNED];
const WAITING_MOVE_STATES: MoveState[] = [MOVE_STATE.WAITING, MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE];

export const showCheckAvailability = ({
  state,
  moves,
  digits,
}: {
  state: PickingState;
  moves: { picked: boolean; productUomQty: number; quantity: number; state: MoveState }[];
  digits: number;
}) => {
  if (!SHOWN_STATES.includes(state)) {
    return false;
  }
  if (moves.every((move) => move.picked || move.productUomQty === move.quantity)) {
    return false;
  }

  return moves.some(
    (move) => WAITING_MOVE_STATES.includes(move.state) && compareAtDigits(move.productUomQty, 0, digits) !== 0,
  );
};

type AssignOrderMove = {
  id: string;
  priority: Priority;
  dateDeadline: string | null;
  date: string | null;
  createdAt: string;
};

// Urgent first, moves with a deadline before the others, then the earliest
// deadline, date and creation.
export const sortMovesForAssign = <TMove extends AssignOrderMove>(moves: TMove[]) =>
  [...moves].sort(
    (left, right) =>
      Number(right.priority === PRIORITY.URGENT) - Number(left.priority === PRIORITY.URGENT) ||
      Number(left.dateDeadline === null) - Number(right.dateDeadline === null) ||
      (left.dateDeadline ?? '').localeCompare(right.dateDeadline ?? '') ||
      (left.date ?? '').localeCompare(right.date ?? '') ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
