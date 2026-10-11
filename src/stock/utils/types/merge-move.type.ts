import { type MoveState } from 'src/stock/types/move-state.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

export type MergeMove = {
  id: string;
  pickingId: string | null;
  state: MoveState;
  productId: string;
  priceUnitMicros: number;
  procureMethod: ProcureMethod;
  locationId: string | null;
  locationDestId: string | null;
  locationFinalId: string | null;
  productUomId: string | null;
  restrictPartnerId: string | null;
  originReturnedMoveId: string | null;
  propagateCancel: boolean;
  descriptionPicking: string | null;
  dateDeadline: string | null;
  productUomQty: number;
  date: string | null;
  origin: string | null;
  moveOrigIds: string[];
  moveDestIds: string[];
  picked: boolean;
};
