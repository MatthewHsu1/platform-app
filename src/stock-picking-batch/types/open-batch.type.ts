import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';

export type OpenBatch = {
  id: string;
  name: string;
  state: BatchState;
  isWave: boolean;
  pickingTypeId: string | null;
  moveCount: number;
  pickings: GroupValues[];
};
