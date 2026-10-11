import { describe, expect, it } from 'vitest';

import { fefoOrder } from 'src/product-expiry/fefo-order';

describe('fefoOrder', () => {
  it('takes the earliest removal date first and quants without one last', () => {
    const order = fefoOrder([
      { id: 'a', removalDate: null, inDate: '2025-01-01T00:00:00.000Z' },
      { id: 'b', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-01T00:00:00.000Z' },
      { id: 'c', removalDate: '2025-01-01T00:00:00.000Z', inDate: '2025-01-03T00:00:00.000Z' },
    ]);

    expect(order.map((quant) => quant.id)).toEqual(['c', 'b', 'a']);
  });

  it('breaks a tie by the older in date, then by id', () => {
    const order = fefoOrder([
      { id: 'z', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-02T00:00:00.000Z' },
      { id: 'y', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-01T00:00:00.000Z' },
      { id: 'x', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-02T00:00:00.000Z' },
    ]);

    expect(order.map((quant) => quant.id)).toEqual(['y', 'x', 'z']);
  });

  it('breaks a tie on both dates by creation order before the id', () => {
    const order = fefoOrder([
      { id: 'a', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T09:00:00.000Z' },
      { id: 'b', removalDate: '2025-01-05T00:00:00.000Z', inDate: '2025-01-01T00:00:00.000Z', createdAt: '2025-01-01T08:00:00.000Z' },
    ]);

    expect(order.map((quant) => quant.id)).toEqual(['b', 'a']);
  });
});
