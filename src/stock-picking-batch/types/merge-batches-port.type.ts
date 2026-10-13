import { type makeClaims } from 'src/shared/claims/claim';
import { type MergeBatch } from 'src/stock-picking-batch/types/merge-batch.type';

type Claims = ReturnType<typeof makeClaims>;

// What a merge reads and writes, so it can run on the real records or on rows in memory.
export type MergeBatchesPort = {
  claims: Pick<Claims, 'withClaim' | 'openJournal' | 'takeClaims' | 'releaseClaims' | 'settleOwnedClaim'>;
  readBatches: (batchIds: string[]) => Promise<(MergeBatch & { name: string | null })[]>;
  readMembers: (
    batchIds: string[],
  ) => Promise<{ id: string; name: string | null; state: string; pickingTypeId: string | null; batchId: string }[]>;
  // Undefined once the batch is gone.
  findBatch: (batchId: string) => Promise<{ name: string | null } | undefined>;
  readLocale: () => Promise<string>;
  // The batches among these whose Validate is running.
  validatingBatchIds: (batchIds: string[]) => Promise<string[]>;
  moveTransfers: (fromBatchIds: string[], toBatchId: string) => Promise<void>;
  writeValues: (
    batchId: string,
    values: { responsibleId: string | null; description: string | null; scheduledDate: string | null },
  ) => Promise<void>;
  assignResponsible: (
    batch: { id: string; name: string; responsibleId: string | null },
    options: { saveKey: string; locale: string },
  ) => Promise<void>;
  destroyBatches: (batchIds: string[]) => Promise<void>;
  recomputeBatch: (batchId: string) => Promise<void>;
};
