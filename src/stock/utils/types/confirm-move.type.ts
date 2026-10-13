import { type MoveState } from 'src/stock/types/move-state.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

export type ConfirmMove = {
  id: string;
  state: MoveState;
  procureMethod: ProcureMethod;
  moveOrigIds: string[];
  ruleProcureMethod: string | null;
  pickingId: string | null;
  pickingTypeId: string | null;
  reservationMethod: ReservationMethod | null;
  referenceIds: string[];
  locationId: string | null;
  locationDestId: string | null;
  moveOrigPickingIds: string[];
};
