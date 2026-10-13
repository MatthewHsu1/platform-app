import { type MoveState } from 'src/stock/types/move-state.type';

// A split chosen before any write: the new move's id and values, the lines it
// takes over and the demand the move keeps.
export type MoveSplitPlan = {
  moveId: string;
  state: MoveState;
  productId: string;
  newMoveId: string;
  newValues: Record<string, unknown>;
  moveOrigIds: string[];
  moveDestIds: string[];
  referenceIds: string[];
  originalDemand: number;
  lineIds: string[];
};
