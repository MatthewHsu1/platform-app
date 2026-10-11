import { type MoveState } from 'src/stock/types/move-state.type';

export type LinkableMove = {
  id: string;
  productId: string;
  productUomId: string | null;
  quantity: number | null;
  productQty: number | null;
  picked: boolean;
  state: MoveState;
  locationId: string | null;
  locationDestId: string | null;
  pickingId: string | null;
  reference: string | null;
};
