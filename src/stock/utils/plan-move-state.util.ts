import { MOVE_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveStateInput } from 'src/stock/utils/types/move-state-input.type';

const isClosed = (state: MoveState) => state === MOVE_STATE.DONE || state === MOVE_STATE.CANCEL;

// A live move's state from its reserved quantity and its original moves.
// Null leaves the state as it is (closed moves, empty drafts).
export const planMoveState = (move: MoveStateInput, digits: number): MoveState | null => {
  if (isClosed(move.state) || (move.state === MOVE_STATE.DRAFT && isZeroAtDigits(move.quantity, digits))) {
    return null;
  }
  if (compareAtDigits(move.quantity, move.productUomQty, digits) >= 0) {
    return MOVE_STATE.ASSIGNED;
  }
  if (!isZeroAtDigits(move.quantity, digits)) {
    return MOVE_STATE.PARTIALLY_AVAILABLE;
  }
  const waitsForOrigin = move.originMoves.some(
    (origin) => compareAtDigits(origin.productUomQty, 0, digits) > 0 && !isClosed(origin.state),
  );
  if ((move.procureMethod === PROCURE_METHOD.MAKE_TO_ORDER && move.originMoves.length === 0) || waitsForOrigin) {
    return MOVE_STATE.WAITING;
  }
  return MOVE_STATE.CONFIRMED;
};
