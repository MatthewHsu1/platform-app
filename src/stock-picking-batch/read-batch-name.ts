import { DEFAULT_BATCH_NAME } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockPickingBatches } from 'src/stock-picking-batch/stock-picking-batch-records';
import { isDefaultBatchName } from 'src/stock-picking-batch/utils/plan-batch-naming.util';

const NAME_WAIT_ATTEMPTS = 10;
const NAME_WAIT_STEP_MS = 300;

// The batch trigger numbers a typed batch soon after it is made; this waits a
// little for that number. `numbered` is false when the batch is gone, has no
// type, or still has no number after the wait.
export const waitForBatchNumber = async (batchId: string) => {
  for (let attempt = 1; ; attempt += 1) {
    const [row] = await stockPickingBatches.find<{ name: string | null; pickingTypeId: string | null }>(
      { id: { eq: batchId } },
      'name pickingTypeId',
    );
    const name = row?.name ?? null;
    const numbered = row !== undefined && row.pickingTypeId !== null && !isDefaultBatchName(name);

    if (row === undefined || row.pickingTypeId === null || numbered || attempt >= NAME_WAIT_ATTEMPTS) {
      return { name, numbered };
    }
    await new Promise((resolve) => setTimeout(resolve, NAME_WAIT_STEP_MS));
  }
};

// The name an answer shows for a batch it made or filled.
export const readBatchName = async (batchId: string) => {
  const { name } = await waitForBatchNumber(batchId);

  return name === null || name === '' ? DEFAULT_BATCH_NAME : name;
};
