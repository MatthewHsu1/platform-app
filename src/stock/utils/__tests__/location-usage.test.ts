import { describe, expect, it } from 'vitest';

import { bypassesReservation, isLocationUnder } from 'src/stock/utils/location-usage.util';

describe('bypassesReservation', () => {
  it('is true for vendor, customer, inventory loss and production locations only', () => {
    expect(['SUPPLIER', 'CUSTOMER', 'INVENTORY', 'PRODUCTION'].every((usage) => bypassesReservation(usage as never))).toBe(true);
    expect(['INTERNAL', 'TRANSIT', 'VIEW'].some((usage) => bypassesReservation(usage as never))).toBe(false);
  });
});

describe('isLocationUnder', () => {
  it('is true for the location itself and every location below it', () => {
    expect(isLocationUnder('v/s/', 'v/s/')).toBe(true);
    expect(isLocationUnder('v/s/shelf/', 'v/s/')).toBe(true);
  });

  it('is false for a sibling whose id starts the same, a parent, or a missing path', () => {
    expect(isLocationUnder('v/s2/', 'v/s/')).toBe(false);
    expect(isLocationUnder('v/', 'v/s/')).toBe(false);
    expect(isLocationUnder(null, 'v/')).toBe(false);
  });
});
