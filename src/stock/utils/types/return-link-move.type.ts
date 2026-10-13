import { type MoveState } from 'src/stock/types/move-state.type';

export type ReturnLinkMove = {
  id: string;
  state: MoveState;
  locationDestPath: string | null;
  originReturnedMoveId: string | null;
  moveOrigIds: string[];
  moveDestIds: string[];
};
