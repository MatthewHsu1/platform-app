import { describe, expect, it } from 'vitest';

import { quantName } from 'src/stock/utils/quant-name.util';

// "<product> - <location full name>" (+ lot, package, owner).
describe('quantName', () => {
  it('names the product and the full location', () => {
    expect(quantName({ productName: 'Treadmill F63', locationName: 'WH/Stock', lotName: null, packageName: null, ownerName: null })).toBe(
      'Treadmill F63 - WH/Stock',
    );
  });

  it('adds the lot, package and owner that are set, in that order', () => {
    expect(quantName({ productName: 'Belt', locationName: 'WH/Stock', lotName: 'LOT-7', packageName: 'PACK-2', ownerName: 'Acme' })).toBe(
      'Belt - WH/Stock - LOT-7 - PACK-2 - Acme',
    );
    expect(quantName({ productName: 'Belt', locationName: 'WH/Stock', lotName: null, packageName: null, ownerName: 'Acme' })).toBe(
      'Belt - WH/Stock - Acme',
    );
  });
});
