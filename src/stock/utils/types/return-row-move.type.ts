import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';

export type ReturnRowMove = {
  id: string;
  productId: string;
  productUomId: string | null;
  state: MoveState;
  locationDestUsage: LocationUsage | null;
};
