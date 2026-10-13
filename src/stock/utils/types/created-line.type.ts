import { type MoveState } from 'src/stock/types/move-state.type';

export type CreatedLine = {
  id: string;
  productId: string;
  productUomId: string | null;
  quantity: number;
  quantityProductUom: number | null;
  picked: boolean;
  pickingId: string | null;
  moveId: string | null;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  state: MoveState;
  name: string | null;
};
