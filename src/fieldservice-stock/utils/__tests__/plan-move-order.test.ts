import { describe, expect, it } from 'vitest';

import { planMoveOrder } from 'src/fieldservice-stock/utils/plan-move-order.util';

describe('planMoveOrder', () => {
  it('writes the order of the transfer on a move that has none or another', () => {
    expect(planMoveOrder('order-1', null)).toBe('order-1');
    expect(planMoveOrder('order-1', 'order-2')).toBe('order-1');
  });

  it('writes nothing when the move already names the order or the transfer has none', () => {
    expect(planMoveOrder('order-1', 'order-1')).toBeNull();
    expect(planMoveOrder(null, 'order-2')).toBeNull();
  });
});
