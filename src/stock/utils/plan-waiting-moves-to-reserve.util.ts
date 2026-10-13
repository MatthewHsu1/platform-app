import { MOVE_STATE, PRIORITY, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { type WaitingMove } from 'src/stock/utils/types/waiting-move.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';

const WAITING_STATES: MoveState[] = [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE];

// Ascending with an empty value last, as the database sorts it.
const compareNullableAsc = (left: string | null, right: string | null) => {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left < right ? -1 : 1;
};

const priorityRank = (priority: Priority) => (priority === PRIORITY.URGENT ? 0 : 1);

export const planWaitingMovesToReserve = ({
  moves,
  today,
  chunkSize,
}: {
  moves: WaitingMove[];
  today: string;
  chunkSize: number;
}): string[][] => {
  const due = moves
    .filter(
      (move) =>
        WAITING_STATES.includes(move.state) &&
        move.productUomQty !== 0 &&
        ((move.reservationDate !== null && move.reservationDate.slice(0, 10) <= today) ||
          move.pickingTypeReservationMethod === RESERVATION_METHOD.AT_CONFIRM),
    )
    .sort(
      (left, right) =>
        compareNullableAsc(left.reservationDate, right.reservationDate) ||
        priorityRank(left.priority) - priorityRank(right.priority) ||
        compareNullableAsc(left.date, right.date) ||
        compareNullableAsc(left.id, right.id),
    )
    .map((move) => move.id);
  const chunks: string[][] = [];

  for (let start = 0; start < due.length; start += chunkSize) {
    chunks.push(due.slice(start, start + chunkSize));
  }

  return chunks;
};
