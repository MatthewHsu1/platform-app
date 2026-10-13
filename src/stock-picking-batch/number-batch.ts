import { CLAIM_HELD_MESSAGE, claimKey, withClaim } from 'src/shared/claims/claim';
import { nameBatch } from 'src/stock-picking-batch/name-batch';
import { stockPickingBatches } from 'src/stock-picking-batch/stock-picking-batch-records';

type BatchToNumber = { name: string | null; isWave: boolean; pickingTypeId: string | null };

type NumberBatchDeps = {
  withClaim: <TResult>(key: string, run: (runId: string) => Promise<TResult>) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;
  wait: (ms: number) => Promise<void>;
  readBatch: (batchId: string) => Promise<BatchToNumber | undefined>;
  nameBatch: typeof nameBatch;
  writeBatch: (batchId: string, data: { pickingTypeId?: string; name: string }) => Promise<void>;
};

export const BATCH_NAME_ACTION = 'batchName';

const ATTEMPTS = 10;
const WAIT_STEP_MS = 300;

// The batch trigger and the transfer trigger can reach one batch at the same
// time, and each would draw its own number. One pass at a time numbers a
// batch: it reads the batch again under the claim, and `needsNumber` judges
// that row, so a pass that comes second finds the first one's number and
// draws none. Returns the batch name as it is afterwards.
export const makeNumberBatch =
  (deps: NumberBatchDeps) =>
  async (
    batchId: string,
    {
      pickingTypeId,
      needsNumber,
      misconfiguredNote,
    }: {
      pickingTypeId: string;
      needsNumber: (current: BatchToNumber) => boolean;
      misconfiguredNote?: { id: string; locale: string | null };
    },
  ): Promise<string | null> => {
    for (let attempt = 1; ; attempt += 1) {
      const outcome = await deps.withClaim(claimKey(BATCH_NAME_ACTION, batchId), async () => {
        const current = await deps.readBatch(batchId);

        if (current === undefined || !needsNumber(current)) {
          return current?.name ?? null;
        }
        const name = await deps.nameBatch(
          { id: batchId, isWave: current.isWave, pickingTypeId },
          misconfiguredNote === undefined ? {} : { misconfiguredNote },
        );

        await deps.writeBatch(batchId, current.pickingTypeId === pickingTypeId ? { name } : { pickingTypeId, name });
        return name;
      });

      if (outcome.kind === 'done') {
        return outcome.result;
      }
      if (attempt >= ATTEMPTS) {
        throw new Error(CLAIM_HELD_MESSAGE);
      }
      await deps.wait(attempt * WAIT_STEP_MS);
    }
  };

export const numberBatch = makeNumberBatch({
  withClaim,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  readBatch: async (batchId) =>
    (await stockPickingBatches.find<BatchToNumber>({ id: { eq: batchId } }, 'name isWave pickingTypeId'))[0],
  nameBatch,
  writeBatch: (batchId, data) => stockPickingBatches.update(batchId, data),
});
