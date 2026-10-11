import { describe, expect, it } from 'vitest';

import { planPickingState, relevantStateAmongMoves } from 'src/stock/utils/plan-picking-state.util';
import { type StateMove } from 'src/stock/utils/types/state-move.type';

const move = (
  state: StateMove['state'],
  productUomQty = 1,
  locationDestUsage: StateMove['locationDestUsage'] = 'CUSTOMER',
  procureMethod: StateMove['procureMethod'] = 'MAKE_TO_STOCK',
): StateMove => ({ state, productUomQty, procureMethod, locationDestUsage });

const pickingFrom = (moves: StateMove[], moveType: 'DIRECT' | 'ONE' = 'DIRECT', locationUsage: StateMove['locationDestUsage'] = 'INTERNAL') =>
  planPickingState({ moveType, locationUsage, currentState: 'CONFIRMED', moves });

describe('relevantStateAmongMoves', () => {
  it('DIRECT: one ready and one waiting move are partly available', () => {
    expect(relevantStateAmongMoves([move('ASSIGNED'), move('CONFIRMED')], 'DIRECT')).toBe('PARTIALLY_AVAILABLE');
  });

  it('ONE: one ready and one waiting move wait', () => {
    expect(relevantStateAmongMoves([move('ASSIGNED'), move('CONFIRMED')], 'ONE')).toBe('CONFIRMED');
  });

  it('DIRECT: waiting for another operation wins over waiting for stock', () => {
    expect(relevantStateAmongMoves([move('WAITING'), move('CONFIRMED')], 'DIRECT')).toBe('WAITING');
  });

  it('DIRECT: two waiting moves wait', () => {
    expect(relevantStateAmongMoves([move('CONFIRMED'), move('CONFIRMED')], 'DIRECT')).toBe('CONFIRMED');
  });

  it('drops ready moves with no demand; none left is ready', () => {
    expect(relevantStateAmongMoves([move('ASSIGNED', 0), move('DONE'), move('CANCEL')], 'DIRECT')).toBe('ASSIGNED');
  });

  it('DIRECT: a waiting move with no demand is ready', () => {
    expect(relevantStateAmongMoves([move('CONFIRMED', 0)], 'DIRECT')).toBe('ASSIGNED');
  });

  it('ONE: all demands zero is ready', () => {
    expect(relevantStateAmongMoves([move('CONFIRMED', 0), move('WAITING', 0)], 'ONE')).toBe('ASSIGNED');
  });

  it('ONE: two ready moves and one out of stock wait (move type "when all are ready")', () => {
    expect(relevantStateAmongMoves([move('ASSIGNED'), move('ASSIGNED'), move('CONFIRMED')], 'ONE')).toBe('CONFIRMED');
  });

  it('ONE: the least ready move decides when it waits for another operation', () => {
    expect(relevantStateAmongMoves([move('ASSIGNED'), move('WAITING')], 'ONE')).toBe('WAITING');
  });
});

describe('planPickingState', () => {
  it('is draft with no moves or with any draft move', () => {
    expect(pickingFrom([])).toBe('DRAFT');
    expect(pickingFrom([move('DRAFT'), move('ASSIGNED')])).toBe('DRAFT');
  });

  it('keeps a cancelled transfer with no moves cancelled', () => {
    expect(planPickingState({ moveType: 'DIRECT', locationUsage: 'INTERNAL', currentState: 'CANCEL', moves: [] })).toBe('CANCEL');
  });

  it('is cancelled when every move is cancelled', () => {
    expect(pickingFrom([move('CANCEL'), move('CANCEL')])).toBe('CANCEL');
  });

  it('is cancelled when only scrap moves were done and another move was cancelled', () => {
    expect(pickingFrom([move('DONE', 1, 'INVENTORY'), move('CANCEL', 1, 'CUSTOMER')])).toBe('CANCEL');
  });

  it('is done when every move is done or cancelled otherwise', () => {
    expect(pickingFrom([move('DONE'), move('CANCEL')])).toBe('DONE');
    expect(pickingFrom([move('DONE', 1, 'INVENTORY')])).toBe('DONE');
  });

  it('a receipt from vendors with live take-from-stock moves is ready', () => {
    expect(pickingFrom([move('CONFIRMED', 5, 'INTERNAL')], 'DIRECT', 'SUPPLIER')).toBe('ASSIGNED');
  });

  it('a receipt with a make-to-order move uses the moves', () => {
    expect(pickingFrom([move('WAITING', 5, 'INTERNAL', 'MAKE_TO_ORDER')], 'DIRECT', 'SUPPLIER')).toBe('WAITING');
  });

  it('DIRECT: a partly available move makes the transfer ready', () => {
    expect(pickingFrom([move('PARTIALLY_AVAILABLE', 2)])).toBe('ASSIGNED');
  });

  it('ONE: two ready moves and one out of stock leave the transfer waiting', () => {
    expect(pickingFrom([move('ASSIGNED'), move('ASSIGNED'), move('CONFIRMED')], 'ONE')).toBe('CONFIRMED');
  });

  it('ONE: a delivery whose first move was set to no demand still waits for the third', () => {
    expect(pickingFrom([move('CONFIRMED', 0), move('ASSIGNED'), move('CONFIRMED')], 'ONE')).toBe('CONFIRMED');
  });
});
