import { describe, expect, it, vi } from 'vitest';

import { readEntirePackLines } from 'src/stock/package/check-entire-pack';
import { planEntirePackBreaks } from 'src/stock/utils/plan-entire-pack.util';

vi.mock('src/stock/stock-records', () => ({
  stockMoveLines: {
    find: vi.fn(async () => [
      { id: 'a', pickingId: 'delivery', packageId: 'pack1', resultPackageId: 'pack1', state: 'ASSIGNED', productId: 'apple', lotId: null, quantity: 1, productUomId: 'pack6', quantityProductUom: null, isEntirePack: true },
      { id: 'b', pickingId: 'delivery', packageId: 'pack1', resultPackageId: 'pack1', state: 'ASSIGNED', productId: 'pear', lotId: null, quantity: 3, productUomId: 'unit', quantityProductUom: 3, isEntirePack: true },
    ]),
  },
}));
vi.mock('src/stock/product/read-stock-products', () => ({
  readStockProducts: vi.fn(
    async () =>
      new Map([
        ['apple', { isStorable: true, uomId: 'unit' }],
        ['pear', { isStorable: true, uomId: 'unit' }],
      ]),
  ),
}));
vi.mock('src/stock/stock-uoms', () => ({
  readResolvedUoms: vi.fn(
    async () =>
      new Map([
        ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
        ['pack6', { id: 'pack6', name: 'Pack of 6', factor: 6, rootId: 'unit', parentPath: 'unit/pack6/' }],
      ]),
  ),
}));
vi.mock('src/stock/stock-settings', () => ({ readStockSettings: () => ({ productUnitDigits: 2 }) }));

describe('readEntirePackLines', () => {
  it('keeps a package whole while the product-unit quantity of a new line in packs of 6 is not written yet', async () => {
    const lines = await readEntirePackLines(['delivery']);
    const packages = new Map([
      [
        'pack1',
        {
          packageId: 'pack1',
          parentPackageId: null,
          packageDestId: null,
          isReusable: false,
          descendantIds: [],
          childIds: [],
          quants: [
            { productId: 'apple', lotId: null, quantity: 6 },
            { productId: 'pear', lotId: null, quantity: 3 },
          ],
        },
      ],
    ]);

    expect(planEntirePackBreaks({ lines, packages, digits: 2 })).toEqual([]);
  });
});
