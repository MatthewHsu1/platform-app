import { describe, expect, it } from 'vitest';

import { planDerivedNames } from 'src/product/utils/plan-derived-names.util';

const templateNames = new Map([['shirt', 'Polo']]);
const variantNames = new Map([['shirt-red', 'Polo (Red)']]);

describe('planDerivedNames', () => {
  it('renames the vendor prices, rules and combo items of a renamed product', () => {
    expect(
      planDerivedNames({
        sellers: [
          { id: 's1', name: 'Acme – Shirt', productTmplId: 'shirt', productId: null, vendorName: 'Acme' },
          {
            id: 's2',
            name: 'Acme – Shirt (Red)',
            productTmplId: 'shirt',
            productId: 'shirt-red',
            vendorName: 'Acme',
          },
        ],
        pricelistRules: [
          { id: 'r1', name: 'Shirt', appliedOn: 'PRODUCT', productTmplId: 'shirt', productId: null, categoryName: null },
          {
            id: 'r2',
            name: 'Shirt (Red)',
            appliedOn: 'PRODUCT_VARIANT',
            productTmplId: 'shirt',
            productId: 'shirt-red',
            categoryName: null,
          },
        ],
        comboItems: [{ id: 'c1', name: 'Shirt (Red)', productId: 'shirt-red' }],
        templateNames,
        variantNames,
      }),
    ).toEqual({
      sellers: [
        { id: 's1', name: 'Acme – Polo' },
        { id: 's2', name: 'Acme – Polo (Red)' },
      ],
      pricelistRules: [
        { id: 'r1', name: 'Polo' },
        { id: 'r2', name: 'Polo (Red)' },
      ],
      comboItems: [{ id: 'c1', name: 'Polo (Red)' }],
    });
  });

  it('renames a category rule after its category', () => {
    expect(
      planDerivedNames({
        sellers: [],
        pricelistRules: [
          {
            id: 'r1',
            name: 'Category: Goods',
            appliedOn: 'PRODUCT_CATEGORY',
            productTmplId: null,
            productId: null,
            categoryName: 'Goods / Bikes',
          },
        ],
        comboItems: [],
        templateNames,
        variantNames,
      }).pricelistRules,
    ).toEqual([{ id: 'r1', name: 'Category: Goods / Bikes' }]);
  });

  it('writes nothing when the names already match', () => {
    expect(
      planDerivedNames({
        sellers: [{ id: 's1', name: 'Acme – Polo', productTmplId: 'shirt', productId: null, vendorName: 'Acme' }],
        pricelistRules: [
          { id: 'r1', name: 'Polo', appliedOn: 'PRODUCT', productTmplId: 'shirt', productId: null, categoryName: null },
        ],
        comboItems: [{ id: 'c1', name: 'Polo (Red)', productId: 'shirt-red' }],
        templateNames,
        variantNames,
      }),
    ).toEqual({ sellers: [], pricelistRules: [], comboItems: [] });
  });
});
