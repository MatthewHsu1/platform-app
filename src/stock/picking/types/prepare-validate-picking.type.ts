import { type PrepareValidateMove } from 'src/stock/picking/types/prepare-validate-move.type';
import { type CreateBackorder } from 'src/stock/types/create-backorder.type';
import { type PickingState } from 'src/stock/types/picking-state.type';

export type PrepareValidatePicking = {
  id: string;
  name: string;
  state: PickingState;
  createBackorder: CreateBackorder;
  moves: PrepareValidateMove[];
  lineCount: number;
};
