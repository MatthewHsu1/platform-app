import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';

export type AutoBatchPicking = GroupValues & {
  id: string;
  state: string;
  pickingTypeId: string;
  batchId: string | null;
  moveCount: number;
  responsibleUserId: string | null;
  priority: string;
  scheduledDate: string | null;
  createdAt: string;
};
