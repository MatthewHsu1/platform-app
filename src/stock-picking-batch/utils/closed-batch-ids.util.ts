// The open batches a transfer may not join: the ones being validated, and the
// batch its original is still in, for a backorder. A backorder whose original
// already left that batch may join it.
export const closedBatchIds = ({
  validatingBatchIds,
  originalBatchId,
}: {
  validatingBatchIds: string[];
  originalBatchId: string | null;
}) => [...new Set([...validatingBatchIds, ...(originalBatchId === null ? [] : [originalBatchId])])];
