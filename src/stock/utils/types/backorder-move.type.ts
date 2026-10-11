import { type MoveState } from 'src/stock/types/move-state.type';

export type BackorderMove = {
  state: MoveState;
  productUomQty: number;
  quantity: number;
  picked: boolean;
  lines: { picked: boolean; quantityInMoveUnit: number }[];
};
