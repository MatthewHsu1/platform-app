import { describe, expect, it } from 'vitest';

import { closedBatchIds } from 'src/stock-picking-batch/utils/closed-batch-ids.util';

describe('closedBatchIds', () => {
  it('keeps a backorder out of the batch its original is still in', () => {
    expect(closedBatchIds({ validatingBatchIds: [], originalBatchId: 'x' })).toEqual(['x']);
  });

  it('lets a backorder join the batch its original already left', () => {
    expect(closedBatchIds({ validatingBatchIds: [], originalBatchId: null })).toEqual([]);
  });

  it('keeps every transfer out of the batches being validated', () => {
    expect(closedBatchIds({ validatingBatchIds: ['v'], originalBatchId: 'x' })).toEqual(['v', 'x']);
  });
});
