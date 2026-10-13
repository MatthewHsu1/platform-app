import { LOCATION_USAGE, MOVE_STATE, MOVE_TYPE, PICKING_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type StateMove } from 'src/stock/utils/types/state-move.type';

// Least ready first: waiting for stock, partly available, waiting for
// another operation, available. Other states sort before them.
const READINESS_RANK: Partial<Record<MoveState, number>> = {
  [MOVE_STATE.CONFIRMED]: 1,
  [MOVE_STATE.PARTIALLY_AVAILABLE]: 2,
  [MOVE_STATE.WAITING]: 3,
  [MOVE_STATE.ASSIGNED]: 4,
};

const rank = (state: MoveState) => READINESS_RANK[state] ?? 0;

export const relevantStateAmongMoves = (
  moves: { state: MoveState; productUomQty: number }[],
  moveType: MoveType,
): MoveState => {
  const todo = moves
    .filter(
      (move) =>
        move.state !== MOVE_STATE.CANCEL &&
        move.state !== MOVE_STATE.DONE &&
        !(move.state === MOVE_STATE.ASSIGNED && move.productUomQty === 0),
    )
    .sort((left, right) => rank(left.state) - rank(right.state) || left.productUomQty - right.productUomQty);

  if (todo.length === 0) {
    return MOVE_STATE.ASSIGNED;
  }

  const first = todo[0];
  const last = todo[todo.length - 1];

  if (moveType === MOVE_TYPE.ONE) {
    if (todo.every((move) => move.productUomQty === 0)) {
      return MOVE_STATE.ASSIGNED;
    }
    if (first.state === MOVE_STATE.CONFIRMED || first.state === MOVE_STATE.PARTIALLY_AVAILABLE) {
      return MOVE_STATE.CONFIRMED;
    }
    return first.state;
  }

  if (
    first.state !== MOVE_STATE.ASSIGNED &&
    todo.some((move) => move.state === MOVE_STATE.ASSIGNED || move.state === MOVE_STATE.PARTIALLY_AVAILABLE)
  ) {
    return MOVE_STATE.PARTIALLY_AVAILABLE;
  }
  if (last.state === MOVE_STATE.CONFIRMED && last.productUomQty === 0) {
    return MOVE_STATE.ASSIGNED;
  }
  return last.state;
};

const isScrapped = (move: StateMove) => move.locationDestUsage === LOCATION_USAGE.INVENTORY;

// First match wins. A transfer cancelled while empty stays cancelled until
// a move is added.
export const planPickingState = ({
  moveType,
  locationUsage,
  currentState,
  moves,
}: {
  moveType: MoveType;
  locationUsage: LocationUsage | null;
  currentState: PickingState;
  moves: StateMove[];
}): PickingState => {
  if (moves.length === 0) {
    return currentState === PICKING_STATE.CANCEL ? PICKING_STATE.CANCEL : PICKING_STATE.DRAFT;
  }
  if (moves.some((move) => move.state === MOVE_STATE.DRAFT)) {
    return PICKING_STATE.DRAFT;
  }
  if (moves.every((move) => move.state === MOVE_STATE.CANCEL)) {
    return PICKING_STATE.CANCEL;
  }
  if (moves.every((move) => move.state === MOVE_STATE.CANCEL || move.state === MOVE_STATE.DONE)) {
    const everyDoneScrapped = moves.every((move) => move.state !== MOVE_STATE.DONE || isScrapped(move));
    const someCancelNotScrapped = moves.some((move) => move.state === MOVE_STATE.CANCEL && !isScrapped(move));

    return everyDoneScrapped && someCancelNotScrapped ? PICKING_STATE.CANCEL : PICKING_STATE.DONE;
  }
  if (
    locationUsage !== null &&
    bypassesReservation(locationUsage) &&
    moves.every((move) => move.procureMethod === PROCURE_METHOD.MAKE_TO_STOCK)
  ) {
    return PICKING_STATE.ASSIGNED;
  }

  const relevant = relevantStateAmongMoves(moves, moveType);

  return relevant === MOVE_STATE.PARTIALLY_AVAILABLE ? PICKING_STATE.ASSIGNED : (relevant as PickingState);
};
