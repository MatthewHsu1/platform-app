import { describe, expect, it } from 'vitest';

import { planPricelistItem, pricelistItemName } from 'src/product/utils/plan-pricelist-item.util';

const item = {
  appliedOn: 'GLOBAL' as const,
  categId: null as string | null,
  productTmplId: null as string | null,
  productId: null as string | null,
  base: 'LIST_PRICE' as const,
  basePricelistId: null as string | null,
  computePrice: 'FIXED' as const,
  priceDiscount: 0,
  priceMarkup: 0,
};

describe('planPricelistItem', () => {
  it('on create derives the level from the target the user picked', () => {
    expect(
      planPricelistItem({ created: true, changedFields: [], item: { ...item, productId: 'v1' }, templateIdOfProduct: 't1' }),
    ).toEqual({ productTmplId: 't1', appliedOn: 'PRODUCT_VARIANT' });
  });

  it('clears targets that do not belong to the level', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['appliedOn'], item: { ...item, appliedOn: 'PRODUCT_CATEGORY', categId: 'c', productTmplId: 't1' }, templateIdOfProduct: null }),
    ).toEqual({ productTmplId: null });
  });

  it('keeps markup = -discount, the changed one wins', () => {
    expect(planPricelistItem({ created: false, changedFields: ['priceMarkup'], item: { ...item, priceMarkup: 25 }, templateIdOfProduct: null })).toEqual({ priceDiscount: -25 });
    expect(planPricelistItem({ created: false, changedFields: ['priceDiscount'], item: { ...item, priceDiscount: 15 }, templateIdOfProduct: null })).toEqual({ priceMarkup: -15 });
  });

  it('a percentage rule with another pricelist is based on that pricelist', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['basePricelistId'], item: { ...item, computePrice: 'PERCENTAGE', basePricelistId: 'B' }, templateIdOfProduct: null }),
    ).toEqual({ base: 'PRICELIST' });
  });

  it('a staff change of the base with the other pricelist still set is kept', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['base'], item: { ...item, computePrice: 'PERCENTAGE', base: 'STANDARD_PRICE', basePricelistId: 'B' }, templateIdOfProduct: null }),
    ).toEqual({});
  });

  it('clearing the other pricelist of a percentage rule goes back to the sales price', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['basePricelistId'], item: { ...item, computePrice: 'PERCENTAGE', base: 'PRICELIST', basePricelistId: null }, templateIdOfProduct: null }),
    ).toEqual({ base: 'LIST_PRICE' });
  });

  it('a formula rule keeps its base when the other pricelist is set', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['basePricelistId'], item: { ...item, computePrice: 'FORMULA', base: 'STANDARD_PRICE', basePricelistId: 'B' }, templateIdOfProduct: null }),
    ).toEqual({});
  });

  it('a new percentage rule without another pricelist keeps the base it was given', () => {
    expect(
      planPricelistItem({ created: true, changedFields: [], item: { ...item, computePrice: 'PERCENTAGE', base: 'STANDARD_PRICE' }, templateIdOfProduct: null }),
    ).toEqual({});
  });

  it('a category set on an existing global rule is kept when the level did not change', () => {
    expect(
      planPricelistItem({ created: false, changedFields: ['categId'], item: { ...item, categId: 'c' }, templateIdOfProduct: null }),
    ).toEqual({});
  });

  it('writes nothing for a clean global rule', () => {
    expect(planPricelistItem({ created: true, changedFields: [], item, templateIdOfProduct: null })).toEqual({});
  });
});

describe('pricelistItemName', () => {
  const names = { categoryName: 'Goods', productName: 'Shirt', variantName: 'Shirt (Red)' };

  it('names the rule after its level', () => {
    expect(pricelistItemName({ appliedOn: 'GLOBAL', ...names })).toBe('All products');
    expect(pricelistItemName({ appliedOn: 'PRODUCT_CATEGORY', ...names })).toBe('Category: Goods');
    expect(pricelistItemName({ appliedOn: 'PRODUCT', ...names })).toBe('Shirt');
    expect(pricelistItemName({ appliedOn: 'PRODUCT_VARIANT', ...names })).toBe('Shirt (Red)');
  });
});
