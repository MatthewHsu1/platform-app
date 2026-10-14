import { describe, expect, it } from 'vitest';

import { orderPickingCounts } from 'src/fieldservice-stock/utils/order-picking-counts.util';

describe('orderPickingCounts', () => {
  it('counts outgoing transfers as deliveries and incoming ones as returns, and internal ones in neither', () => {
    expect(orderPickingCounts(['OUTGOING', 'OUTGOING', 'INCOMING', 'INTERNAL', null])).toEqual({ deliveryCount: 2, returnCount: 1 });
  });

  it('counts nothing for an order without transfers', () => {
    expect(orderPickingCounts([])).toEqual({ deliveryCount: 0, returnCount: 0 });
  });
});
