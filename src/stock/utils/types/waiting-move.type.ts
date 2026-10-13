import { type MoveState } from 'src/stock/types/move-state.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

export type WaitingMove = {
  id: string;
  state: MoveState;
  productUomQty: number;
  reservationDate: string | null;
  priority: Priority;
  date: string | null;
  pickingTypeReservationMethod: ReservationMethod | null;
};
