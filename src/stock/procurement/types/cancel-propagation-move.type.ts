import { type MoveState } from 'src/stock/types/move-state.type';

export type CancelPropagationMove = {
  id: string;
  state: MoveState;
  propagateCancel: boolean;
  locationDestId: string | null;
  locationId: string | null;
  moveOrigIds: string[];
  moveDestIds: string[];
};
