import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';

export type MergeBatch = {
  id: string;
  state: BatchState;
  isWave: boolean;
  pickingTypeId: string | null;
  scheduledDate: string | null;
  responsibleId: string | null;
  description: string | null;
};
