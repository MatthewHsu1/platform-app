import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';

export type BatchForCheck = { name: string; state: BatchState; pickingTypeId: string | null };
