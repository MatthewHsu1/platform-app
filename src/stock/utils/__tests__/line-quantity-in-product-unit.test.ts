import { describe, expect, it } from 'vitest';

import { lineQuantityInProductUnit } from 'src/stock/utils/line-quantity-in-product-unit.util';

const uoms = new Map([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['pack6', { id: 'pack6', name: 'Pack of 6', factor: 6, rootId: 'unit', parentPath: 'unit/pack6/' }],
]);

describe('lineQuantityInProductUnit', () => {
  it('keeps the product-unit quantity the trigger wrote', () => {
    expect(
      lineQuantityInProductUnit({ line: { quantity: 2, quantityProductUom: 12, productUomId: 'pack6' }, productUomId: 'unit', uoms, digits: 2 }),
    ).toBe(12);
  });

  it('converts a new line of 2 packs of 6 to 12 units', () => {
    expect(
      lineQuantityInProductUnit({ line: { quantity: 2, quantityProductUom: null, productUomId: 'pack6' }, productUomId: 'unit', uoms, digits: 2 }),
    ).toBe(12);
  });
});
