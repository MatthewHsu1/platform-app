import { type MoveState } from 'src/stock/types/move-state.type';

export type ValidateMove = {
  id: string;
  pickingId: string | null;
  state: MoveState;
  quantity: number;
  productUomQty: number;
  picked: boolean;
  toInventory: boolean;
  isInventory: boolean;
  productUomId: string;
};
