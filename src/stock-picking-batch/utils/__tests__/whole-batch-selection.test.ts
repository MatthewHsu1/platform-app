import { describe, expect, it } from 'vitest';

import { isWholeBatchSelection } from 'src/stock-picking-batch/utils/whole-batch-selection.util';

const counts: Record<string, number> = { b1: 2, b2: 3 };
const memberCount = (batchId: string) => counts[batchId] ?? 0;

describe('isWholeBatchSelection', () => {
  it('takes both transfers of a two-transfer batch as the batch', () => {
    expect(isWholeBatchSelection({ selected: [{ batchId: 'b1' }, { batchId: 'b1' }], memberCount, detachCount: 0 })).toBe(true);
  });

  it('does not take part of a batch as the batch', () => {
    expect(isWholeBatchSelection({ selected: [{ batchId: 'b2' }, { batchId: 'b2' }], memberCount, detachCount: 0 })).toBe(false);
  });

  it('takes the batch less the transfers leaving it as the batch', () => {
    expect(isWholeBatchSelection({ selected: [{ batchId: 'b2' }, { batchId: 'b2' }], memberCount, detachCount: 1 })).toBe(true);
  });

  it('does not take transfers of two batches, or with no batch, as one batch', () => {
    expect(isWholeBatchSelection({ selected: [{ batchId: 'b1' }, { batchId: 'b2' }], memberCount, detachCount: 0 })).toBe(false);
    expect(isWholeBatchSelection({ selected: [{ batchId: null }, { batchId: null }], memberCount, detachCount: 0 })).toBe(false);
  });
});
