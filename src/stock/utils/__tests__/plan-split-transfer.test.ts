import { describe, expect, it } from 'vitest';

import { planSplitTransfer } from 'src/stock/utils/plan-split-transfer.util';

const move = (id: string, productUomQty: number, quantity: number, state = 'ASSIGNED') => ({
  id,
  productUomQty,
  quantity,
  state: state as 'ASSIGNED',
});

describe('planSplitTransfer', () => {
  it('splits a move partly done: demand 10, quantity 4', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00001', digits: 2, moves: [move('m1', 10, 4, 'PARTIALLY_AVAILABLE')] })).toEqual({
      kind: 'split',
      splitMoveIds: ['m1'],
      zeroMoveIds: [],
    });
  });

  it('sends the moves with no quantity to the backorder whole', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00002', digits: 2, moves: [move('a', 1, 1), move('b', 1, 0, 'CONFIRMED')] })).toEqual({
      kind: 'split',
      splitMoveIds: ['a'],
      zeroMoveIds: ['b'],
    });
  });

  it('refuses when nothing is filled in', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00003', digits: 2, moves: [move('a', 5, 0), move('b', 2, 0)] })).toEqual({
      kind: 'refuse',
      reason: '{name}: Nothing to split. Fill the quantities you want in a new transfer in the done quantities',
      values: { name: 'WH/OUT/00003' },
    });
  });

  it('refuses when every move is complete', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00004', digits: 2, moves: [move('a', 5, 5), move('b', 2, 2)] })).toEqual({
      kind: 'refuse',
      reason: '{name}: Nothing to split, all demand is done. For split you need at least one line not fully fulfilled',
      values: { name: 'WH/OUT/00004' },
    });
  });

  it('refuses a quantity above the demand', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00005', digits: 2, moves: [move('a', 5, 6), move('b', 2, 0)] })).toEqual({
      kind: 'refuse',
      reason: "{name}: Can't split: quantities done can't be above demand",
      values: { name: 'WH/OUT/00005' },
    });
  });

  it('treats an empty transfer as nothing to split', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00006', digits: 2, moves: [] }).kind).toBe('refuse');
  });

  it('does not split done or cancelled moves', () => {
    const plan = planSplitTransfer({ name: 'WH/OUT/00007', digits: 2, moves: [move('done', 5, 3, 'DONE'), move('open', 5, 2)] });
    expect(plan).toEqual({ kind: 'split', splitMoveIds: ['open'], zeroMoveIds: [] });
  });

  it('refuses to split a draft move that holds less than its demand', () => {
    expect(planSplitTransfer({ name: 'WH/OUT/00008', digits: 2, moves: [move('draft', 5, 2, 'DRAFT')] })).toEqual({
      kind: 'refuse',
      reason: 'You cannot split a draft move. It needs to be confirmed first.',
      values: { name: 'WH/OUT/00008' },
    });
  });
});
