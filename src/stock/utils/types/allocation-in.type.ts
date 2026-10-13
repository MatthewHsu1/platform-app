import { type MoveState } from 'src/stock/types/move-state.type';

// An incoming move offered to a delivery move. `destDemand` is the demand of
// the moves it already feeds, in the product's unit.
export type AllocationIn = {
  id: string;
  productId: string;
  productQty: number;
  quantity: number;
  state: MoveState;
  locationDestId: string;
  destDemand: number;
  pickingId: string | null;
  referenceIds: string[];
  isLinkedToOut: boolean;
};
