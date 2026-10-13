import { type MoveState } from 'src/stock/types/move-state.type';
import { type ActionDoneLine } from 'src/stock/utils/types/action-done-line.type';

export type ActionDoneMove = {
  id: string;
  state: MoveState;
  picked: boolean;
  productUomQty: number;
  isInventory: boolean;
  productUomId: string;
  lines: ActionDoneLine[];
};
