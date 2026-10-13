import { type CreateBackorder } from 'src/stock/types/create-backorder.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

export type PickingTypeRow = {
  id: string;
  name: string | null;
  sequence: number | null;
  referenceSequenceId: string | null;
  sequenceCode: string | null;
  defaultLocationSrcId: string | null;
  defaultLocationDestId: string | null;
  code: PickingTypeCode;
  returnPickingTypeId: string | null;
  warehouseId: string | null;
  active: boolean;
  useCreateLots: boolean;
  useExistingLots: boolean;
  printLabel: boolean;
  reservationMethod: ReservationMethod;
  reservationDaysBefore: number | null;
  reservationDaysBeforePriority: number | null;
  createBackorder: CreateBackorder;
  moveType: MoveType;
  barcode: string | null;
};
