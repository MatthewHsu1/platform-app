import { describe, expect, it } from 'vitest';

import { planMoveState } from 'src/stock/utils/plan-move-state.util';
import { type MoveStateInput } from 'src/stock/utils/types/move-state-input.type';

const move = (input: Partial<MoveStateInput>): MoveStateInput => ({
  state: 'CONFIRMED',
  quantity: 0,
  productUomQty: 1,
  procureMethod: 'MAKE_TO_STOCK',
  originMoves: [],
  ...input,
});

describe('planMoveState', () => {
  it('is available when the reserved quantity covers the demand', () => {
    expect(planMoveState(move({ quantity: 100, productUomQty: 100 }), 2)).toBe('ASSIGNED');
  });

  it('compares at the unit digits', () => {
    expect(planMoveState(move({ quantity: 0.999, productUomQty: 1 }), 2)).toBe('ASSIGNED');
  });

  it('is partly available with some quantity', () => {
    expect(planMoveState(move({ quantity: 1, productUomQty: 2 }), 2)).toBe('PARTIALLY_AVAILABLE');
  });

  it('waits for stock after an unreserve', () => {
    expect(planMoveState(move({ state: 'ASSIGNED', quantity: 0, productUomQty: 10 }), 2)).toBe('CONFIRMED');
  });

  it('waits for another operation: make to order with no original move', () => {
    expect(planMoveState(move({ procureMethod: 'MAKE_TO_ORDER' }), 2)).toBe('WAITING');
  });

  it('waits for another operation while an original move with demand is open', () => {
    expect(planMoveState(move({ originMoves: [{ productUomQty: 5, state: 'ASSIGNED' }] }), 2)).toBe('WAITING');
  });

  it('waits for stock once the original moves are done or have no demand', () => {
    expect(
      planMoveState(
        move({
          procureMethod: 'MAKE_TO_ORDER',
          originMoves: [
            { productUomQty: 5, state: 'DONE' },
            { productUomQty: 0, state: 'CONFIRMED' },
          ],
        }),
        2,
      ),
    ).toBe('CONFIRMED');
  });

  it('leaves done, cancelled and empty draft moves alone', () => {
    expect(planMoveState(move({ state: 'DONE', quantity: 2 }), 2)).toBeNull();
    expect(planMoveState(move({ state: 'CANCEL' }), 2)).toBeNull();
    expect(planMoveState(move({ state: 'DRAFT', quantity: 0 }), 2)).toBeNull();
  });

  it('moves a draft move that already has a quantity', () => {
    expect(planMoveState(move({ state: 'DRAFT', quantity: 1, productUomQty: 1 }), 2)).toBe('ASSIGNED');
  });
});
