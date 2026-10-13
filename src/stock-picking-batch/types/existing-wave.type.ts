import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';

// An open wave auto wave may add lines to. `moveCount` counts every move of
// its transfers; `lines` are its move lines, `pickingGroups` its transfers'.
export type ExistingWave = {
  id: string;
  name: string;
  pickingTypeId: string;
  state: BatchState;
  moveCount: number;
  pickingCount: number;
  lines: { locationId: string; productId: string; categoryId: string | null; moveId: string; pickingId: string }[];
  pickingGroups: GroupValues[];
};
