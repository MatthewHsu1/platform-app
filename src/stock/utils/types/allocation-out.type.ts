import { type MoveState } from 'src/stock/types/move-state.type';

// A delivery move to allocate to, with every quantity in the product's unit.
export type AllocationOut = {
  id: string;
  productId: string;
  productQty: number;
  quantity: number;
  state: MoveState;
  reservationDate: string | null;
  pickingId: string | null;
  referenceIds: string[];
  lines: { id: string; quantityProductUom: number; locationId: string }[];
  moveOrigs: { id: string; productQty: number }[];
};
