import { describe, expect, it } from 'vitest';

import {
  applyTypedQuantities,
  hasNonZeroQuantity,
  planReturnAll,
  planReturnRows,
} from 'src/stock/utils/plan-return-rows.util';

const doneMove = (id: string, productId: string, productUomId: string) => ({
  id,
  productId,
  productUomId,
  state: 'DONE' as const,
  locationDestUsage: 'CUSTOMER' as const,
});

describe('planReturnRows', () => {
  it('makes one row per returnable move, quantity 0, in the move unit', () => {
    expect(
      planReturnRows({
        pickingCount: 1,
        pickingState: 'DONE',
        moves: [doneMove('m1', 'productA', 'unit'), doneMove('m2', 'productA', 'dozen')],
      }),
    ).toEqual({
      kind: 'rows',
      rows: [
        { moveId: 'm1', productId: 'productA', uomId: 'unit', quantity: 0 },
        { moveId: 'm2', productId: 'productA', uomId: 'dozen', quantity: 0 },
      ],
    });
  });

  it('skips cancelled moves and moves into an inventory location (scrap, adjustments)', () => {
    const plan = planReturnRows({
      pickingCount: 1,
      pickingState: 'DONE',
      moves: [
        doneMove('kept', 'productA', 'unit'),
        { ...doneMove('cancelled', 'productB', 'unit'), state: 'CANCEL' },
        { ...doneMove('scrapped', 'productC', 'unit'), locationDestUsage: 'INVENTORY' },
      ],
    });
    expect(plan.kind === 'rows' && plan.rows.map((row) => row.moveId)).toEqual(['kept']);
  });

  it('refuses several transfers, a transfer not done, and a transfer with nothing to return', () => {
    expect(planReturnRows({ pickingCount: 2, pickingState: 'DONE', moves: [] })).toEqual({
      kind: 'refuse',
      reason: 'You may only return one picking at a time.',
    });
    expect(
      planReturnRows({ pickingCount: 1, pickingState: 'ASSIGNED', moves: [doneMove('m1', 'productA', 'unit')] }),
    ).toEqual({ kind: 'refuse', reason: 'You may only return Done pickings.' });
    expect(
      planReturnRows({
        pickingCount: 1,
        pickingState: 'DONE',
        moves: [{ ...doneMove('m1', 'productA', 'unit'), state: 'CANCEL' }],
      }),
    ).toEqual({
      kind: 'refuse',
      reason:
        'No products to return (only lines in Done state and not fully returned yet can be returned).',
    });
  });
});

describe('planReturnAll', () => {
  // Delivery of A 10, B 11, C 12; B already returned 5 (the return reserved 5).
  const rows = [
    { moveId: 'moveA', productId: 'productA', uomId: 'unit', quantity: 0 },
    { moveId: 'moveB', productId: 'productB', uomId: 'unit', quantity: 0 },
    { moveId: 'moveC', productId: 'productC', uomId: 'unit', quantity: 0 },
  ];

  it('returns what was delivered less what earlier returns of the same move took', () => {
    expect(
      planReturnAll({
        rows,
        digits: 2,
        moves: [
          { id: 'moveA', quantity: 10, destinationMoves: [] },
          { id: 'moveB', quantity: 11, destinationMoves: [{ originReturnedMoveId: 'moveB', quantity: 5 }] },
          { id: 'moveC', quantity: 12, destinationMoves: [{ originReturnedMoveId: null, quantity: 12 }] },
        ],
      }).map((row) => [row.moveId, row.quantity]),
    ).toEqual([
      ['moveA', 10],
      ['moveB', 6],
      ['moveC', 12],
    ]);
  });

  it('rounds to the unit precision', () => {
    expect(
      planReturnAll({
        rows: [rows[0]],
        digits: 2,
        moves: [
          { id: 'moveA', quantity: 1, destinationMoves: [{ originReturnedMoveId: 'moveA', quantity: 0.333333 }] },
        ],
      })[0].quantity,
    ).toBe(0.67);
  });
});

describe('typed quantities', () => {
  const rows = [
    { moveId: 'm1', productId: 'productA', uomId: 'unit', quantity: 0 },
    { moveId: 'm2', productId: 'productB', uomId: 'unit', quantity: 0 },
  ];

  it('takes the typed quantity of each row and ignores moves that are not rows', () => {
    expect(
      applyTypedQuantities(rows, [
        { moveId: 'm2', quantity: 5 },
        { moveId: 'other', quantity: 9 },
      ]).map((row) => row.quantity),
    ).toEqual([0, 5]);
  });

  it('needs one quantity that is not zero at the unit precision', () => {
    expect(hasNonZeroQuantity(rows, 2)).toBe(false);
    expect(hasNonZeroQuantity([{ ...rows[0], quantity: 0.001 }], 2)).toBe(false);
    expect(hasNonZeroQuantity([{ ...rows[0], quantity: 1 }], 2)).toBe(true);
  });
});
