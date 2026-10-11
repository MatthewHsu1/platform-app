import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

export type BackorderSource = {
  picking: PickingRow;
  note: unknown;
  reservationMethod: ReservationMethod | null;
  referenceSequenceId: string | null;
  liveMoveIds: string[];
};
