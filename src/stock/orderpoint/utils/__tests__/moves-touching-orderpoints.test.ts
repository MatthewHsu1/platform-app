import { describe, expect, it } from 'vitest';

import { movesTouchingOrderpoints } from 'src/stock/orderpoint/utils/moves-touching-orderpoints.util';

const move = {
  productId: 'A',
  locationId: 'L-stock',
  locationDestId: 'L-customer',
  state: 'CONFIRMED',
  date: '2026-10-10T08:00:00.000Z',
  productUomQty: 5,
  priority: '0',
};
const locations = (snapshot: typeof move) => ({
  productId: snapshot.productId,
  locationId: snapshot.locationId,
  locationDestId: snapshot.locationDestId,
});

describe('movesTouchingOrderpoints', () => {
  it('takes a new move', () => {
    expect(movesTouchingOrderpoints('created', [{ after: move }])).toEqual([locations(move)]);
  });

  it('takes a move whose state, date or demand changed, as it is now', () => {
    for (const change of [{ state: 'DONE' }, { date: '2026-10-12T08:00:00.000Z' }, { productUomQty: 7 }]) {
      const after = { ...move, ...change };

      expect(movesTouchingOrderpoints('updated', [{ before: move, after }])).toEqual([locations(after)]);
    }
  });

  it('takes a move whose product or locations changed both as it was and as it is now', () => {
    const after = { ...move, locationId: 'L-other', productId: 'B' };

    expect(movesTouchingOrderpoints('updated', [{ before: move, after }])).toEqual([locations(after), locations(move)]);
  });

  it('leaves out a change that moves no forecast', () => {
    expect(movesTouchingOrderpoints('updated', [{ before: move, after: { ...move, priority: '1' } }])).toEqual([]);
  });

  it('takes a deleted move as it was, so its rules lose its quantity', () => {
    expect(movesTouchingOrderpoints('deleted', [{ before: move }])).toEqual([locations(move)]);
    expect(movesTouchingOrderpoints('destroyed', [{ before: move }])).toEqual([locations(move)]);
  });

  it('takes a restored move', () => {
    expect(movesTouchingOrderpoints('restored', [{ before: { ...move }, after: move }])).toEqual([locations(move)]);
  });
});
