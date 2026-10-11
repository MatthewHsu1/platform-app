import { describe, expect, it } from 'vitest';

import { destinationKeyOf, lineFilterForKey, parseQuantKey, quantKey, sourceKeyOf } from 'src/stock/quant/quant-key';

describe('quantKey', () => {
  it('joins the five parts with an empty string for a missing one, and parses back', () => {
    const parts = { productId: 'p', locationId: 'l', lotId: null, packageId: null, ownerId: 'o' };
    expect(quantKey(parts)).toBe('p|l|||o');
    expect(parseQuantKey('p|l|||o')).toEqual(parts);
  });

  it('refuses a key that does not have five parts', () => {
    expect(() => parseQuantKey('p|l')).toThrow('Not a stock key: p|l');
  });
});

describe('line keys', () => {
  const line = { productId: 'p', locationId: 'stock', locationDestId: 'customers', ownerId: null, packageId: 'box', resultPackageId: null };

  it('takes from the source location and package, and adds to the destination and result package', () => {
    expect(sourceKeyOf(line)).toBe('p|stock||box|');
    expect(destinationKeyOf(line)).toBe('p|customers|||');
  });

  it('filters the lines of a key on each side', () => {
    expect(lineFilterForKey('p|stock|||', 'source')).toEqual({
      productId: { eq: 'p' },
      locationId: { eq: 'stock' },
      ownerId: { is: 'NULL' },
      lotId: { is: 'NULL' },
      packageId: { is: 'NULL' },
    });
    expect(lineFilterForKey('p|customers|||o', 'destination')).toEqual({
      productId: { eq: 'p' },
      locationDestId: { eq: 'customers' },
      ownerId: { eq: 'o' },
      lotId: { is: 'NULL' },
      resultPackageId: { is: 'NULL' },
    });
  });

  it('keeps the line lot on both sides and filters the lines of a lot key on that lot', () => {
    const lotLine = { productId: 'p', locationId: 'from', locationDestId: 'to', lotId: 'lot1', ownerId: 'o' };

    expect(sourceKeyOf(lotLine)).toBe(quantKey({ productId: 'p', locationId: 'from', lotId: 'lot1', packageId: null, ownerId: 'o' }));
    expect(destinationKeyOf(lotLine)).toBe(quantKey({ productId: 'p', locationId: 'to', lotId: 'lot1', packageId: null, ownerId: 'o' }));
    expect(lineFilterForKey('p|from|lot1||o', 'source')).toEqual({
      productId: { eq: 'p' },
      locationId: { eq: 'from' },
      ownerId: { eq: 'o' },
      lotId: { eq: 'lot1' },
      packageId: { is: 'NULL' },
    });
  });
});

describe('line keys with packages', () => {
  const line = {
    productId: 'p',
    locationId: 'from',
    locationDestId: 'to',
    lotId: null,
    packageId: 'pallet1',
    resultPackageId: 'box9',
    ownerId: null,
  };

  it('takes from the source package and brings into the destination package', () => {
    expect(sourceKeyOf(line)).toBe(quantKey({ productId: 'p', locationId: 'from', lotId: null, packageId: 'pallet1', ownerId: null }));
    expect(destinationKeyOf(line)).toBe(quantKey({ productId: 'p', locationId: 'to', lotId: null, packageId: 'box9', ownerId: null }));
  });

  it('filters the source lines on the package and the destination lines on the result package', () => {
    expect(lineFilterForKey('p|from||pallet1|', 'source')).toMatchObject({ packageId: { eq: 'pallet1' } });
    expect(lineFilterForKey('p|to||box9|', 'destination')).toMatchObject({ resultPackageId: { eq: 'box9' } });
  });
});
