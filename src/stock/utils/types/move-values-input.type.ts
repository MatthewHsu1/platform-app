import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export type MoveValuesInput = {
  move: {
    state: MoveState;
    date: string | null;
    productUomQty: number;
    priority: Priority;
    isInventory: boolean;
    inventoryName: string | null;
    picked: boolean;
    descriptionPickingManual: string | null;
    productUomId: string | null;
    packagingUomId: string | null;
    reservationDate: string | null;
  };
  lines: { quantity: number; productUomId: string | null; picked: boolean }[];
  product: {
    displayName: string;
    defaultCode: string | null;
    uomId: string;
    descriptionPicking: string | null;
    descriptionPickingin: string | null;
    descriptionPickingout: string | null;
    templateDescription: string | null;
  };
  pickingType: {
    code: PickingTypeCode;
    reservationMethod: ReservationMethod;
    reservationDaysBefore: number | null;
    reservationDaysBeforePriority: number | null;
  } | null;
  picking: { name: string | null; origin: string | null } | null;
  scrapName: string | null;
  originMoves: { state: MoveState; date: string | null }[];
  sourceName: string | null;
  destinationName: string | null;
  uoms: Map<string, ResolvedUom>;
  digits: number;
};
