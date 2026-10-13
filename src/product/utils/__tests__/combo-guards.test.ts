import { describe, expect, it } from 'vitest';

import {
  productsRefusedForDelete,
  saleComboRefusal,
  variantsRefusedForDelete,
} from 'src/product/utils/combo-guards.util';

describe('saleComboRefusal', () => {
  it('refuses a sellable combo that holds a product that cannot be sold', () => {
    expect(saleComboRefusal({ productType: 'COMBO', saleOk: true, itemSaleOk: [true, false] })).toBe(
      'A combo product that can be sold can only hold products that can be sold.',
    );
  });

  it('accepts a combo that cannot be sold, other types, and all-sellable items', () => {
    expect(saleComboRefusal({ productType: 'COMBO', saleOk: false, itemSaleOk: [false] })).toBeNull();
    expect(saleComboRefusal({ productType: 'CONSU', saleOk: true, itemSaleOk: [false] })).toBeNull();
    expect(saleComboRefusal({ productType: 'COMBO', saleOk: true, itemSaleOk: [true, true] })).toBeNull();
    expect(saleComboRefusal({ productType: 'COMBO', saleOk: true, itemSaleOk: [] })).toBeNull();
  });
});

describe('delete refusals', () => {
  it('refuses the deleted variants a combo item holds', () => {
    expect(variantsRefusedForDelete({ deletedIds: ['V1', 'V2'], heldIds: new Set(['V2', 'V9']) })).toEqual(['V2']);
  });

  it('refuses a product when any of its variants is held', () => {
    expect(
      productsRefusedForDelete({
        variantIdsByProduct: new Map([
          ['P1', ['V1', 'V2']],
          ['P2', ['V3']],
        ]),
        heldIds: new Set(['V2']),
      }),
    ).toEqual(['P1']);
  });
});
