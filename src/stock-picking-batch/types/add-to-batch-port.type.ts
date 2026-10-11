import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';

// What Add to batch reads and writes, so it can run on the real records or on rows in memory.
export type AddToBatchPort = {
  // In the order of the ids asked for: a new batch takes the first transfer's type.
  readPickings: (pickingIds: string[]) => Promise<(PickingForCheck & { batchId: string | null })[]>;
  // Undefined when the batch is gone or the user cannot read it.
  readChosenBatch: (
    batchId: string,
  ) => Promise<{ id: string; name: string; state: BatchState; pickingTypeId: string | null; isWave: boolean } | undefined>;
  // Creates the batch unless a request sent before made it; its state, or
  // undefined once it is gone.
  createBatch: (
    batchId: string,
    values: { pickingTypeId: string | null; responsibleId: string | null; description: string | null; isWave: false },
  ) => Promise<BatchState | undefined>;
  // The batches among these whose Validate is running.
  validatingBatchIds: (batchIds: string[]) => Promise<string[]>;
  moveTransfers: (pickingIds: string[], batchId: string) => Promise<void>;
  confirmBatch: (batchId: string) => Promise<void>;
  readBatchName: (batchId: string) => Promise<string>;
};
