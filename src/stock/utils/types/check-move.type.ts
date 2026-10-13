import { type MoveState } from 'src/stock/types/move-state.type';
import { type CheckLine } from 'src/stock/utils/types/check-line.type';

export type CheckMove = {
  id: string;
  state: MoveState;
  quantity: number;
  productUomQty: number;
  picked: boolean;
  isScrap: boolean;
  productName: string;
  uomName: string;
  lines: CheckLine[];
};
