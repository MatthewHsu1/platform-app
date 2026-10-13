import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type ActorRow } from 'src/stock/types/actor-row.type';

export type BatchRow = ActorRow & {
  id: string;
  name: string | null;
  description: string | null;
  state: BatchState;
  isWave: boolean;
  pickingTypeId: string | null;
  responsibleId: string | null;
  scheduledDate: string | null;
  updatedAt: string;
  deletedAt?: string | null;
};
