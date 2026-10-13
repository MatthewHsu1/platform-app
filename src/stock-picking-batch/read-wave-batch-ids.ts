import { stockPickingBatches } from 'src/stock-picking-batch/stock-picking-batch-records';

// The waves among the given batches.
export const readWaveBatchIds = async (batchIds: string[]) => {
  const ids = [...new Set(batchIds)];

  return ids.length === 0
    ? new Set<string>()
    : new Set((await stockPickingBatches.find<{ id: string }>({ id: { in: ids }, isWave: { eq: true } }, 'id')).map((batch) => batch.id));
};
