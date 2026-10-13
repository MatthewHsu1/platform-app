import { type MoveState } from 'src/stock/types/move-state.type';

export type AllocationMoveLite = {
  id: string;
  productId: string;
  isStorable: boolean;
  state: MoveState;
  productQty: number;
  locationId: string;
  pickingId: string | null;
  moveOrigIds: string[];
};
