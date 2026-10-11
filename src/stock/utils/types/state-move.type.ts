import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

export type StateMove = {
  state: MoveState;
  productUomQty: number;
  procureMethod: ProcureMethod;
  locationDestUsage: LocationUsage | null;
};
