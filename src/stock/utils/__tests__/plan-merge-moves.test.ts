import { describe, expect, it } from 'vitest';

import { planMergeMoves } from 'src/stock/utils/plan-merge-moves.util';
import { type MergeMove } from 'src/stock/utils/types/merge-move.type';

const TEN = 10_000_000;

const move = (id: string, overrides: Partial<MergeMove> = {}): MergeMove => ({
  id,
  pickingId: 'receipt',
  state: 'CONFIRMED',
  productId: 'A',
  priceUnitMicros: TEN,
  procureMethod: 'MAKE_TO_STOCK',
  locationId: 'vendors',
  locationDestId: 'stock',
  locationFinalId: null,
  productUomId: 'unit',
  restrictPartnerId: null,
  originReturnedMoveId: null,
  propagateCancel: true,
  descriptionPicking: null,
  dateDeadline: null,
  productUomQty: 1,
  date: '2026-10-01T00:00:00.000Z',
  origin: null,
  moveOrigIds: [],
  moveDestIds: [],
  picked: false,
  ...overrides,
});

const plan = (confirmedIds: string[], candidates: MergeMove[], moveType: 'DIRECT' | 'ONE' = 'DIRECT') =>
  planMergeMoves({
    confirmedIds,
    candidates,
    moveTypeByPicking: new Map([['receipt', moveType]]),
    linked: new Map(),
    digits: 2,
  });

describe('planMergeMoves', () => {
  it('merges the moves of one product into the first and leaves the other product alone', () => {
    const candidates = [
      move('a3', { productUomQty: 3, date: '2026-10-03T00:00:00.000Z' }),
      move('a5', { productUomQty: 5, date: '2026-10-01T00:00:00.000Z' }),
      move('a1', { productUomQty: 1, date: '2026-10-02T00:00:00.000Z' }),
      move('b5', { productId: 'B', productUomQty: 5 }),
    ];

    const result = plan(['a3', 'a5', 'a1', 'b5'], candidates);

    expect(result.merges).toEqual([
      {
        keepId: 'a3',
        absorbedIds: ['a5', 'a1'],
        data: { productUomQty: 9, date: '2026-10-01T00:00:00.000Z', origin: null, state: 'CONFIRMED' },
        addMoveOrigIds: [],
        addMoveDestIds: [],
      },
    ]);
    expect(result.destroy).toEqual(['a5', 'a1']);
    expect(result.survivors).toEqual(['a3', 'b5']);
  });

  it('joins the distinct origins once each', () => {
    const result = plan(
      ['m1', 'm2', 'm3'],
      [move('m1', { productUomQty: 3, origin: 'MPS' }), move('m2', { productUomQty: 5, origin: 'PO0001' }), move('m3', { productUomQty: 3, origin: 'MPS' })],
    );

    expect(result.merges).toHaveLength(1);
    expect(result.merges[0].data.origin).toBe('MPS/PO0001');
    expect(result.merges[0].data.productUomQty).toBe(11);
  });

  it('keeps the latest date when the transfer ships all at once', () => {
    const result = plan(
      ['m1', 'm2'],
      [move('m1', { date: '2026-10-01T00:00:00.000Z' }), move('m2', { date: '2026-10-05T00:00:00.000Z' })],
      'ONE',
    );

    expect(result.merges[0].data.date).toBe('2026-10-05T00:00:00.000Z');
  });

  it('does not merge moves with another description, nor done or draft moves', () => {
    const result = plan(
      ['m1', 'm2'],
      [
        move('m1'),
        move('m2', { descriptionPicking: 'Fragile' }),
        move('done', { state: 'DONE' }),
        move('draft', { state: 'DRAFT' }),
      ],
    );

    expect(result.merges).toEqual([]);
    expect(result.survivors).toEqual(['m1', 'm2']);
  });

  it('carries the original and destination links of the merged moves to the kept one', () => {
    const result = plan(
      ['m1', 'm2'],
      [move('m1', { moveOrigIds: ['o1'] }), move('m2', { moveOrigIds: ['o2'], moveDestIds: ['d2'] })],
    );

    expect(result.merges[0]).toMatchObject({ addMoveOrigIds: ['o2'], addMoveDestIds: ['d2'] });
  });

  it('absorbs a negative move into a positive one with the same key', () => {
    const result = plan(['neg'], [move('pos', { productUomQty: 5 }), move('neg', { productUomQty: -2, descriptionPicking: 'Return' })]);

    expect(result.absorbs).toEqual([
      { positiveId: 'pos', data: { productUomQty: 3, priceUnitMicros: TEN }, addMoveOrigIds: [], addMoveDestIds: [] },
    ]);
    expect(result.destroy).toEqual(['neg']);
    expect(result.negativeUpdates).toEqual([]);
    expect(result.survivors).toEqual(['pos']);
  });

  it('empties and cancels a smaller positive move and keeps the rest of the negative one', () => {
    const result = plan(['neg'], [move('pos', { productUomQty: 2 }), move('neg', { productUomQty: -5 })]);

    expect(result.absorbs).toEqual([
      { positiveId: 'pos', data: { productUomQty: 0, priceUnitMicros: TEN }, addMoveOrigIds: [], addMoveDestIds: [] },
    ]);
    expect(result.negativeUpdates).toEqual([{ negativeId: 'neg', productUomQty: -3, priceUnitMicros: TEN }]);
    expect(result.cancel).toEqual(['pos']);
    expect(result.destroy).toEqual([]);
    expect(result.survivors).toEqual(['neg']);
  });

  it('keeps the quantity-weighted unit price when it absorbs, and absorbs only a move with the same unit price', () => {
    const same = plan(['neg'], [move('pos', { productUomQty: 4, priceUnitMicros: 12_000_000 }), move('neg', { productUomQty: -1, priceUnitMicros: 12_000_000 })]);
    expect(same.absorbs[0].data).toEqual({ productUomQty: 3, priceUnitMicros: 12_000_000 });

    const other = plan(['neg'], [move('pos', { productUomQty: 4, priceUnitMicros: 12_000_000 }), move('neg', { productUomQty: -1, priceUnitMicros: 6_000_000 })]);
    expect(other.absorbs).toEqual([]);
  });
});
