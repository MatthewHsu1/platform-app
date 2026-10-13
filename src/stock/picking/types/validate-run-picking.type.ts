import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

export type ValidateRunPicking = {
  id: string;
  state: PickingState;
  ownerId: string | null;
  pickingTypeCode: PickingTypeCode | null;
  moveIds: string[];
};
