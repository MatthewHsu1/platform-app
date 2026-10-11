import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ClaimModule from 'src/shared/claims/claim';
import { claims, db } from 'src/stock/move/__tests__/fakes/fake-records';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { confirmPickings, resumeConfirm } from 'src/stock/picking/actions/confirm-pickings';

vi.mock('src/stock/stock-records', async () => (await import('src/stock/move/__tests__/fakes/fake-records')).fakeStockRecords);
vi.mock('src/shared/claims/claim', async (importOriginal) => {
  const real = await importOriginal<typeof ClaimModule>();
  const { claims: fake } = await import('src/stock/move/__tests__/fakes/fake-records');
  return { ...real, ...real.makeClaims(fake.store) };
});
vi.mock('src/stock/move/recompute-move', () => ({ recomputeMove: vi.fn(async () => {}) }));
vi.mock('src/stock/move/actions/assign-moves', () => ({ assignMoves: vi.fn(async () => {}) }));
vi.mock('src/stock/orderpoint/run-orderpoints-for-confirmed-moves', () => ({ runOrderpointsForConfirmedMoves: vi.fn(async () => {}) }));
vi.mock('src/stock/product/recompute-product-quantities', () => ({ recomputeProductQuantities: vi.fn(async () => {}) }));
vi.mock('src/stock/product/read-stock-products', () => ({
  readStockProducts: vi.fn(async () => new Map([['A', { productId: 'A', isStorable: true }]])),
}));

const move = (id: string, productUomQty: number, date: string) => ({
  id,
  name: id,
  sequence: 10,
  state: 'DRAFT',
  productId: 'A',
  productUomId: 'unit',
  productUomQty,
  quantity: 0,
  date,
  pickingId: 'p1',
  pickingTypeId: 'out',
  procureMethod: 'MAKE_TO_STOCK',
  propagateCancel: true,
  picked: false,
  priceUnit: { amountMicros: 10_000_000, currencyCode: 'USD' },
  createdAt: '2026-10-01T00:00:00.000Z',
});

const seed = () => {
  db.reset();
  db.seed('stockPickings', [
    {
      id: 'p1',
      name: 'OUT/1',
      state: 'DRAFT',
      moveType: 'DIRECT',
      scheduledDate: '2026-10-05T00:00:00.000Z',
      pickingTypeId: 'out',
    },
  ]);
  db.seed('stockPickingTypes', [{ id: 'out', reservationMethod: 'MANUAL' }]);
  db.seed('stockMoves', [move('m1', 3, '2026-10-05T00:00:00.000Z'), move('m2', 5, '2026-10-06T00:00:00.000Z')]);
  vi.mocked(recomputeMove).mockClear();
};

const outcome = () => ({
  pickingState: db.rows('stockPickings')[0].state,
  moves: db.rows('stockMoves').map((row) => ({ id: row.id, state: row.state, productUomQty: row.productUomQty })),
});

describe('Mark as Todo after a stopped run', () => {
  beforeEach(seed);

  it('confirms the draft moves of a transfer and merges the alike ones (3 and 5 make 8)', async () => {
    await confirmPickings(['p1']);

    expect(outcome()).toEqual({ pickingState: 'CONFIRMED', moves: [{ id: 'm1', state: 'CONFIRMED', productUomQty: 8 }] });
  });

  it('finishes the merge and the recomputes when the run stopped after the state writes', async () => {
    await confirmPickings(['p1']);
    const clean = outcome();

    seed();
    // The merge writes the kept move's new quantity after the state writes.
    db.crashOn = (table, id, data) => table === 'stockMoves' && id === 'm1' && 'productUomQty' in data;

    await expect(confirmPickings(['p1'])).rejects.toThrow('crash');
    expect(outcome()).toEqual({
      pickingState: 'DRAFT',
      moves: [
        { id: 'm1', state: 'CONFIRMED', productUomQty: 3 },
        { id: 'm2', state: 'CONFIRMED', productUomQty: 5 },
      ],
    });

    claims.advanceMinutes(16);
    vi.mocked(recomputeMove).mockClear();
    await confirmPickings(['p1']);

    expect(outcome()).toEqual(clean);
    expect(vi.mocked(recomputeMove)).toHaveBeenCalled();
  });

  it('recomputes the transfer when the stopped run had already done everything but the recompute', async () => {
    db.crashOn = (table) => table === 'stockPickings';
    await expect(confirmPickings(['p1'])).rejects.toThrow('crash');

    claims.advanceMinutes(16);
    await confirmPickings(['p1']);

    expect(outcome()).toEqual({ pickingState: 'CONFIRMED', moves: [{ id: 'm1', state: 'CONFIRMED', productUomQty: 8 }] });
  });

  it('the daily job finishes a run that stopped after its first write, as a clean run does', async () => {
    await confirmPickings(['p1']);
    const clean = outcome();

    seed();
    db.crashOn = (table, id, data) => table === 'stockMoves' && id === 'm1' && 'productUomQty' in data;
    await expect(confirmPickings(['p1'])).rejects.toThrow('crash');

    claims.advanceMinutes(16);
    await resumeConfirm('p1');

    expect(outcome()).toEqual(clean);
    expect(claims.rows.has('confirm:p1')).toBe(false);
  });

  it('the daily job frees a run that stopped before its first write and leaves the transfer as it was', async () => {
    const before = outcome();
    claims.rows.set('confirm:p1', {
      id: 'claim-confirm:p1',
      key: 'confirm:p1',
      runId: 'stopped-run',
      startedAt: '2026-10-08T09:00:00.000Z',
      finishedAt: null,
      progress: { steps: { 'confirm:moves': { plan: { moveIds: ['m1', 'm2'] }, done: false } } },
    });

    await resumeConfirm('p1');

    expect(outcome()).toEqual(before);
    expect(claims.rows.has('confirm:p1')).toBe(false);
  });
});
