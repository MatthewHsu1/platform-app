import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from 'src/stock/move/__tests__/fakes/fake-records';
import { cancelMoves } from 'src/stock/move/actions/cancel-moves';
import { recomputeMove } from 'src/stock/move/recompute-move';

vi.mock('src/stock/stock-records', async () => (await import('src/stock/move/__tests__/fakes/fake-records')).fakeStockRecords);
vi.mock('src/stock/move/recompute-move', () => ({ recomputeMove: vi.fn(async () => {}) }));
vi.mock('src/stock/quant/recompute-reserved', () => ({ recomputeReserved: vi.fn(async () => {}) }));
vi.mock('src/stock/product/recompute-product-quantities', () => ({ recomputeProductQuantities: vi.fn(async () => {}) }));
vi.mock('src/stock/product/read-stock-products', () => ({ readStockProducts: vi.fn(async () => new Map()) }));

describe('cancelMoves', () => {
  beforeEach(() => {
    db.reset();
    db.seed('stockMoves', [
      { id: 'up', state: 'ASSIGNED', productId: 'A', pickingId: null, picked: false, procureMethod: 'MAKE_TO_STOCK', propagateCancel: true },
      { id: 'down', state: 'WAITING', productId: 'A', pickingId: null, picked: false, procureMethod: 'MAKE_TO_ORDER', propagateCancel: true },
    ]);
    db.seed('stockMoveMoveRels', [{ id: 'link', moveOrigId: 'up', moveDestId: 'down' }]);
    vi.mocked(recomputeMove).mockClear();
  });

  it('cancels the move and recomputes it and the move chained after it', async () => {
    await cancelMoves(['up']);

    expect(db.rows('stockMoves').find((row) => row.id === 'up')?.state).toBe('CANCEL');
    const recomputed = vi.mocked(recomputeMove).mock.calls.flatMap(([ids]) => ids);
    expect(recomputed).toEqual(expect.arrayContaining(['up', 'down']));
  });
});
