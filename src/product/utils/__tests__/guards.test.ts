import { describe, expect, it } from 'vitest';

import {
  attributeChangeRefusal,
  attributeInUse,
  attributeValueChangeRefusal,
  classifyValueUsage,
  findBarcodeClash,
} from 'src/product/utils/guards.util';

describe('findBarcodeClash', () => {
  const variants = [
    { id: 'a', barcode: '111', active: true },
    { id: 'b', barcode: '222', active: false },
  ];
  const packagings = [{ id: 'p', barcode: '333' }];

  it('finds another active variant with the barcode', () => {
    expect(findBarcodeClash({ barcode: '111', selfId: 'x', variants, packagings })).toBe('variant');
  });

  it('ignores archived variants and itself', () => {
    expect(findBarcodeClash({ barcode: '222', selfId: 'x', variants, packagings })).toBeNull();
    expect(findBarcodeClash({ barcode: '111', selfId: 'a', variants, packagings })).toBeNull();
  });

  it('finds a packaging with the barcode', () => {
    expect(findBarcodeClash({ barcode: '333', selfId: 'x', variants, packagings })).toBe('packaging');
  });

  it('allows an empty barcode', () => {
    expect(findBarcodeClash({ barcode: null, selfId: 'x', variants, packagings })).toBeNull();
  });

  it("checks a product's barcode against other products' variants, not its own", () => {
    expect(
      findBarcodeClash({ barcode: '111', selfId: 'product', ownVariantIds: ['a'], variants, packagings }),
    ).toBeNull();
    expect(
      findBarcodeClash({ barcode: '111', selfId: 'product', ownVariantIds: ['c'], variants, packagings }),
    ).toBe('variant');
    expect(
      findBarcodeClash({ barcode: '333', selfId: 'product', ownVariantIds: ['a'], variants, packagings }),
    ).toBe('packaging');
  });
});

describe('attributeChangeRefusal', () => {
  it('refuses delete, archive and a mode change while a product uses the attribute', () => {
    expect(attributeChangeRefusal({ usedOnProducts: true, changedFields: [], operation: 'deleted' })).toBe(
      'Products use this attribute. Remove it from them first.',
    );
    expect(attributeChangeRefusal({ usedOnProducts: true, changedFields: ['active'], operation: 'updated' })).toBe(
      'Products use this attribute. Remove it from them first.',
    );
    expect(attributeChangeRefusal({ usedOnProducts: true, changedFields: ['createVariant'], operation: 'updated' })).toBe(
      'Products use this attribute, so its variant creation mode cannot change.',
    );
  });

  it('allows anything when no product uses it, and a rename always', () => {
    expect(attributeChangeRefusal({ usedOnProducts: false, changedFields: [], operation: 'deleted' })).toBeNull();
    expect(attributeChangeRefusal({ usedOnProducts: true, changedFields: ['name'], operation: 'updated' })).toBeNull();
  });

  // An attribute named by any line cannot be deleted.
  it('refuses a delete while only an archived line, or a line on an archived product, names it', () => {
    expect(
      attributeChangeRefusal({ usedOnProducts: false, hasLines: true, changedFields: [], operation: 'deleted' }),
    ).toBe(
      'Archived products or archived attribute lines still use this attribute. Remove it from them, or archive the attribute instead.',
    );
  });

  it('still allows archiving and a mode change when only archived lines name it', () => {
    expect(
      attributeChangeRefusal({ usedOnProducts: false, hasLines: true, changedFields: ['active'], operation: 'updated' }),
    ).toBeNull();
    expect(
      attributeChangeRefusal({ usedOnProducts: false, hasLines: true, changedFields: ['createVariant'], operation: 'updated' }),
    ).toBeNull();
  });
});

describe('attributeValueChangeRefusal', () => {
  it('refuses delete while an active product uses the value', () => {
    expect(
      attributeValueChangeRefusal({ usedOnActiveProducts: true, usedOnlyOnArchived: false, changedFields: [], operation: 'deleted' }),
    ).toEqual({ kind: 'refuse', reason: 'Active products use this value. Remove it from them first.' });
  });

  it('archives instead of deleting when only archived variants use it', () => {
    expect(
      attributeValueChangeRefusal({ usedOnActiveProducts: false, usedOnlyOnArchived: true, changedFields: [], operation: 'deleted' }),
    ).toEqual({ kind: 'archive' });
  });

  it('refuses moving a used value to another attribute', () => {
    expect(
      attributeValueChangeRefusal({ usedOnActiveProducts: true, usedOnlyOnArchived: false, changedFields: ['attributeId'], operation: 'updated' }),
    ).toEqual({ kind: 'refuse', reason: 'Products use this value, so it stays on its attribute.' });
  });
});

describe('attributeInUse', () => {
  it('counts an active line on an active product', () => {
    expect(attributeInUse([{ lineActive: true, productActive: true }])).toBe(true);
  });

  it('ignores an archived line and a line on an archived product', () => {
    expect(attributeInUse([{ lineActive: false, productActive: true }])).toBe(false);
    expect(attributeInUse([{ lineActive: true, productActive: false }])).toBe(false);
    expect(attributeInUse([])).toBe(false);
  });

  it('allows unarchiving a used attribute', () => {
    expect(attributeChangeRefusal({ usedOnProducts: true, changedFields: [], operation: 'updated' })).toBeNull();
  });
});

describe('value usage classification ', () => {
  const refusalFor = (input: Parameters<typeof classifyValueUsage>[0], operation: 'updated' | 'deleted') =>
    attributeValueChangeRefusal({
      ...classifyValueUsage(input),
      changedFields: operation === 'updated' ? ['attributeId'] : [],
      operation,
    });

  it('refuses deleting a never-a-variant value on an active line of an active product', () => {
    expect(refusalFor({ lines: [{ lineActive: true, productActive: true }], variantActiveFlags: [] }, 'deleted')).toEqual({
      kind: 'refuse',
      reason: 'Active products use this value. Remove it from them first.',
    });
  });

  it('archives instead of deleting when variants exist and all are archived', () => {
    expect(refusalFor({ lines: [{ lineActive: true, productActive: false }], variantActiveFlags: [false, false] }, 'deleted')).toEqual({
      kind: 'archive',
    });
  });

  it('allows deleting a value on an archived product that still has an active variant', () => {
    expect(refusalFor({ lines: [{ lineActive: true, productActive: false }], variantActiveFlags: [true] }, 'deleted')).toBeNull();
  });

  it('allows deleting an unused value', () => {
    expect(refusalFor({ lines: [], variantActiveFlags: [] }, 'deleted')).toBeNull();
  });

  it('refuses moving a value used on an active product, allows moving an unused one', () => {
    expect(refusalFor({ lines: [{ lineActive: true, productActive: true }], variantActiveFlags: [] }, 'updated')).toEqual({
      kind: 'refuse',
      reason: 'Products use this value, so it stays on its attribute.',
    });
    expect(refusalFor({ lines: [], variantActiveFlags: [false] }, 'updated')).toBeNull();
  });
});
