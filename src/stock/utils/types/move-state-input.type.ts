import { type MoveState } from 'src/stock/types/move-state.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';

export type MoveStateInput = {
  state: MoveState;
  quantity: number;
  productUomQty: number;
  procureMethod: ProcureMethod;
  originMoves: { productUomQty: number; state: MoveState }[];
};
