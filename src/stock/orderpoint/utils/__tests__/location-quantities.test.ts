import { describe, expect, it } from 'vitest';

import { type LocationStock } from 'src/stock/orderpoint/types/location-stock.type';
import { quantitiesUpTo } from 'src/stock/orderpoint/utils/location-quantities.util';

const NOW = new Date('2026-10-10T12:00:00.000Z');

// WH/Stock holds 10, of which 3 sit in a lot past its removal date. Open moves:
// 5 in and 2 out on the 20th (the 2 late that evening), 7 in on the 21st.
const stock: LocationStock = {
  products: [{ id: 'p', templateId: 't', productType: 'CONSU' }],
  scopeLocationIds: new Set(['stock', 'shelf']),
  quants: [
    { productId: 'p', locationId: 'stock', quantity: 7, reservedQuantity: 0, removalDate: null },
    { productId: 'p', locationId: 'shelf', quantity: 3, reservedQuantity: 0, removalDate: '2026-10-05T00:00:00.000Z' },
  ],
  moves: [
    {
      productId: 'p',
      state: 'CONFIRMED',
      productQty: 5,
      locationId: 'vendors',
      locationDestId: 'stock',
      locationFinalId: null,
      date: '2026-10-20T15:00:00.000Z',
    },
    {
      productId: 'p',
      state: 'ASSIGNED',
      productQty: 2,
      locationId: 'stock',
      locationDestId: 'customers',
      locationFinalId: null,
      date: '2026-10-20T23:30:00.000Z',
    },
    {
      productId: 'p',
      state: 'CONFIRMED',
      productQty: 7,
      locationId: 'vendors',
      locationDestId: 'stock',
      locationFinalId: null,
      date: '2026-10-21T08:00:00.000Z',
    },
  ],
};

describe('quantitiesUpTo', () => {
  it('counts the open moves dated up to the end of the asked day, not the day after', () => {
    expect(quantitiesUpTo(stock, { toDay: '2026-10-20', digits: 2, now: NOW }).get('p')).toMatchObject({
      qtyAvailable: 10,
      virtualAvailable: 10,
    });
  });

  it('counts every open move when no end day is asked', () => {
    expect(quantitiesUpTo(stock, { toDay: null, digits: 2, now: NOW }).get('p')).toMatchObject({
      qtyAvailable: 10,
      virtualAvailable: 17,
    });
  });

  it('keeps expired stock on hand but takes it out of the forecast once', () => {
    expect(quantitiesUpTo(stock, { toDay: '2026-10-19', digits: 2, now: NOW }).get('p')).toMatchObject({
      qtyAvailable: 10,
      freeQty: 7,
      virtualAvailable: 7,
    });
  });
});
