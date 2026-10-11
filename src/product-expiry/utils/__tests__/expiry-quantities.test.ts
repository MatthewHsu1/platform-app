import { describe, expect, it } from 'vitest';

import {
  expiredUnreserved,
  keepFreshForReservation,
  quantAvailableQuantity,
  withExpiredUnreserved,
} from 'src/product-expiry/utils/expiry-quantities.util';

const today = new Date('2025-03-10T12:00:00.000Z');

describe('keepFreshForReservation', () => {
  const quants = [
    { id: 'past', removalDate: '2025-03-09T00:00:00.000Z' },
    { id: 'due', removalDate: '2025-03-10T00:00:00.000Z' },
    { id: 'undated', removalDate: null },
  ];

  it('skips stock to be removed before the move date and keeps undated stock', () => {
    expect(
      keepFreshForReservation({ quants, useExpirationDate: true, moveDate: '2025-03-10T00:00:00.000Z' }).map((quant) => quant.id),
    ).toEqual(['due', 'undated']);
  });

  it('keeps everything for a product without expiry', () => {
    expect(keepFreshForReservation({ quants, useExpirationDate: false, moveDate: '2025-03-10T00:00:00.000Z' })).toEqual(quants);
  });
});

describe('expiredUnreserved and withExpiredUnreserved', () => {
  it('takes expired unreserved stock out of free and forecast, not out of on hand', () => {
    const expired = expiredUnreserved(
      [
        { quantity: 10, reservedQuantity: 2, removalDate: '2025-03-09T00:00:00.000Z' },
        { quantity: 5, reservedQuantity: 0, removalDate: '2025-03-20T00:00:00.000Z' },
      ],
      today,
    );

    expect(expired).toBe(8);
    expect(withExpiredUnreserved({ qtyAvailable: 15, freeQty: 13, virtualAvailable: 15 }, expired)).toEqual({
      qtyAvailable: 15,
      freeQty: 5,
      virtualAvailable: 7,
    });
  });

  it('counts a lot to be removed later today as free until tomorrow, and one removed at midnight as expired', () => {
    expect(expiredUnreserved([{ quantity: 4, reservedQuantity: 0, removalDate: '2025-03-10T08:00:00.000Z' }], today)).toBe(0);
    expect(expiredUnreserved([{ quantity: 4, reservedQuantity: 0, removalDate: '2025-03-10T00:00:00.000Z' }], today)).toBe(4);
    expect(
      expiredUnreserved([{ quantity: 4, reservedQuantity: 0, removalDate: '2025-03-10T08:00:00.000Z' }], new Date('2025-03-11T00:00:00.000Z')),
    ).toBe(4);
  });

  it('keeps stock whose removal date is still ahead in the forecast', () => {
    expect(expiredUnreserved([{ quantity: 10, reservedQuantity: 0, removalDate: '2025-03-18T00:00:00.000Z' }], today)).toBe(0);
  });
});

describe('quantAvailableQuantity', () => {
  it('is on hand less reserved, and 0 once the removal date is reached for a product with expiry', () => {
    const quant = { quantity: 10, reservedQuantity: 2, removalDate: '2025-03-09T00:00:00.000Z', now: today };

    expect(quantAvailableQuantity({ ...quant, removalDate: null, useExpirationDate: true })).toBe(8);
    expect(quantAvailableQuantity({ ...quant, useExpirationDate: true })).toBe(0);
    expect(quantAvailableQuantity({ ...quant, useExpirationDate: false })).toBe(8);
  });
});
