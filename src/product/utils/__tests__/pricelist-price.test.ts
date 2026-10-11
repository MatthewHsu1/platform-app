import { describe, expect, it } from 'vitest';

import { resolveUoms } from 'src/uom/utils/uom.util';
import { findLoopThroughRule, pricelistPrice, sortPricelistRules } from 'src/product/utils/pricelist-price.util';
import { type Pricelist } from 'src/product/utils/types/pricelist.type';
import { type PricedProduct } from 'src/product/utils/types/priced-product.type';
import { type PricelistRule } from 'src/product/utils/types/pricelist-rule.type';

const { resolved } = resolveUoms([
  { id: 'Units', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
  { id: 'Pack6', name: 'Pack of 6', relativeUomId: 'Units', relativeFactor: 6, seedKey: null },
]);
const units = resolved.get('Units')!;
const pack = resolved.get('Pack6')!;

let order = 0;
const rule = (values: Partial<PricelistRule>): PricelistRule => ({
  id: `r${(order += 1)}`,
  createdAt: `2026-10-08T00:00:0${order}.000Z`,
  appliedOn: 'GLOBAL',
  categPath: null,
  categCompleteName: null,
  productTmplId: null,
  productId: null,
  minQuantity: 0,
  dateStart: null,
  dateEnd: null,
  base: 'LIST_PRICE',
  basePricelistId: null,
  computePrice: 'FIXED',
  fixedPrice: 0,
  percentPrice: 0,
  priceDiscount: 0,
  priceMarkup: 0,
  priceRound: 0,
  priceSurcharge: 0,
  priceMinMargin: 0,
  priceMaxMargin: 0,
  ...values,
});

const product = (values: Partial<PricedProduct>): PricedProduct => ({
  templateId: 'P',
  variantId: 'Pv',
  templateVariantIds: ['Pv'],
  categPath: null,
  uom: units,
  currencyCode: 'USD',
  listPrice: 0,
  priceExtra: 0,
  standardPrice: 0,
  ...values,
});

const price = (pricelists: Pricelist[], pricelistId: string, priced: PricedProduct, quantity: number, uom = units) =>
  pricelistPrice({
    pricelists: new Map(pricelists.map((pricelist) => [pricelist.id, pricelist])),
    pricelistId,
    product: priced,
    quantity,
    uom,
    date: '2026-10-08T12:00:00.000Z',
    digits: 2,
  }).price;

describe('pricelistPrice', () => {
  it('example A: formula 15 % off, rounded to 5, minus 0.01 = 84.99', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'Pricelist L',
      currencyCode: 'USD',
      rules: [rule({ computePrice: 'FORMULA', priceDiscount: 15, priceMarkup: -15, priceRound: 5, priceSurcharge: -0.01 })],
    };
    expect(price([list], 'L', product({ listPrice: 99 }), 1)).toBeCloseTo(84.99, 10);
  });

  describe('example B: quantity tiers in packs of 6', () => {
    const r1 = rule({ appliedOn: 'PRODUCT', productTmplId: 'P', minQuantity: 12, fixedPrice: 8 });
    const r3 = rule({ appliedOn: 'PRODUCT', productTmplId: 'P', minQuantity: 0, fixedPrice: 9 });
    const r2 = rule({ computePrice: 'PERCENTAGE', percentPrice: 10 });
    const list: Pricelist = { id: 'L', name: 'Pricelist L', currencyCode: 'USD', rules: [r2, r3, r1] };
    const shirt = product({ listPrice: 10 });

    it('2 packs = 12 units reach the 12 tier: 48.00 per pack', () => {
      expect(price([list], 'L', shirt, 2, pack)).toBe(48);
    });

    it('1 pack = 6 units: 54.00 per pack', () => {
      expect(price([list], 'L', shirt, 1, pack)).toBe(54);
    });

    it('only the global rule: 60.00 - 10 % = 54.00 per pack', () => {
      expect(price([{ ...list, rules: [r2] }], 'L', shirt, 2, pack)).toBe(54);
    });

    it('sorts variant, product, category, global; then higher minimum first', () => {
      expect(sortPricelistRules([r2, r3, r1]).map((sorted) => sorted.id)).toEqual([r1.id, r3.id, r2.id]);
    });
  });

  describe('example C: chained pricelists, cost markup and margins', () => {
    const b: Pricelist = {
      id: 'B',
      name: 'Pricelist B',
      currencyCode: 'USD',
      rules: [rule({ computePrice: 'FORMULA', base: 'STANDARD_PRICE', priceDiscount: -25, priceMarkup: 25, priceMinMargin: 20, priceMaxMargin: 30 })],
    };
    const a: Pricelist = {
      id: 'A',
      name: 'Pricelist A',
      currencyCode: 'USD',
      rules: [rule({ computePrice: 'PERCENTAGE', percentPrice: 10, base: 'PRICELIST', basePricelistId: 'B' })],
    };
    const item = product({ listPrice: 100, standardPrice: 60 });

    it('B: 60 + 25 % = 75, raised to the 20 minimum margin = 80.00', () => {
      expect(price([a, b], 'B', item, 1)).toBe(80);
    });

    it('A: 10 % off B = 72.00', () => {
      expect(price([a, b], 'A', item, 1)).toBe(72);
    });

    it('A based on list price ignores B: 90.00', () => {
      const listBased = { ...a, rules: [{ ...a.rules[0], base: 'LIST_PRICE' as const }] };
      expect(price([listBased, b], 'A', item, 1)).toBe(90);
    });
  });

  it('adds the variant extra price to a list-price base, never to a fixed price', () => {
    const percentage: Pricelist = { id: 'L', name: 'Pricelist L', currencyCode: 'USD', rules: [rule({ computePrice: 'PERCENTAGE', percentPrice: 0 })] };
    const fixed: Pricelist = { id: 'F', name: 'Pricelist F', currencyCode: 'USD', rules: [rule({ fixedPrice: 20 })] };
    const variant = product({ listPrice: 20, priceExtra: 2 });
    expect(price([percentage], 'L', variant, 1)).toBe(22);
    expect(price([fixed], 'F', variant, 1)).toBe(20);
  });

  it('uses the list price when no rule applies', () => {
    expect(price([{ id: 'E', name: 'Pricelist E', currencyCode: 'USD', rules: [] }], 'E', product({ listPrice: 7 }), 1)).toBe(7);
  });

  it('skips a rule outside its dates (both ends count)', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'Pricelist L',
      currencyCode: 'USD',
      rules: [rule({ fixedPrice: 1, dateStart: '2026-01-01T00:00:00.000Z', dateEnd: '2026-10-08T11:59:59.000Z' })],
    };
    expect(price([list], 'L', product({ listPrice: 7 }), 1)).toBe(7);
  });

  it('a category rule covers sub-categories', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'Pricelist L',
      currencyCode: 'USD',
      rules: [rule({ appliedOn: 'PRODUCT_CATEGORY', categPath: 'g/', categCompleteName: 'Goods', fixedPrice: 3 })],
    };
    expect(price([list], 'L', product({ listPrice: 7, categPath: 'g/p/' }), 1)).toBe(3);
    expect(price([list], 'L', product({ listPrice: 7, categPath: 's/' }), 1)).toBe(7);
  });

  it('refuses to mix currencies', () => {
    expect(() => price([{ id: 'E', name: 'Pricelist E', currencyCode: 'EUR', rules: [] }], 'E', product({ listPrice: 7 }), 1)).toThrow(
      'Pricelist currency EUR differs from the product currency USD. Twenty has no exchange rates.',
    );
  });

  it('refuses a pricelist loop instead of running forever', () => {
    const a: Pricelist = { id: 'A', name: 'Pricelist A', currencyCode: 'USD', rules: [rule({ computePrice: 'PERCENTAGE', base: 'PRICELIST', basePricelistId: 'B' })] };
    const b: Pricelist = { id: 'B', name: 'Pricelist B', currencyCode: 'USD', rules: [rule({ computePrice: 'PERCENTAGE', base: 'PRICELIST', basePricelistId: 'A' })] };
    expect(() => price([a, b], 'A', product({ listPrice: 7 }), 1)).toThrow('Pricelists Pricelist A ⇒ Pricelist B ⇒ Pricelist A are based on each other.');
  });
});

describe('pricelistPrice, more rules', () => {
  const sixPack = (id: string, values: Partial<PricelistRule>) => rule({ id, ...values });

  it('a rule dated to the second of the asked time still applies (both ends count)', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'L',
      currencyCode: 'USD',
      rules: [rule({ fixedPrice: 1, dateStart: '2026-10-08T12:00:00.000Z', dateEnd: '2026-10-08T12:00:00.000Z' })],
    };
    expect(price([list], 'L', product({ listPrice: 7 }), 1)).toBe(1);
  });

  it('a variant-level rule prices the template when it has exactly that one variant', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'L',
      currencyCode: 'USD',
      rules: [rule({ appliedOn: 'PRODUCT_VARIANT', productTmplId: 'P', productId: 'Pv', fixedPrice: 4 })],
    };
    const template = product({ listPrice: 7, variantId: null, templateVariantIds: ['Pv'] });
    expect(price([list], 'L', template, 1)).toBe(4);
    expect(price([list], 'L', { ...template, templateVariantIds: ['Pv', 'Pw'] }, 1)).toBe(7);
  });

  it('a chained pricelist is asked in the same unit: B 10 % off 60 per pack, A 10 % off that = 48.60', () => {
    const b: Pricelist = {
      id: 'B',
      name: 'B',
      currencyCode: 'USD',
      rules: [rule({ computePrice: 'PERCENTAGE', percentPrice: 10 })],
    };
    const a: Pricelist = {
      id: 'A',
      name: 'A',
      currencyCode: 'USD',
      rules: [rule({ computePrice: 'PERCENTAGE', percentPrice: 10, base: 'PRICELIST', basePricelistId: 'B' })],
    };
    expect(price([a, b], 'A', product({ listPrice: 10 }), 1, pack)).toBeCloseTo(48.6, 10);
  });

  it('a percentage rule with a minimum quantity applies from that quantity in the product unit', () => {
    const list: Pricelist = {
      id: 'L',
      name: 'L',
      currencyCode: 'USD',
      rules: [sixPack('big', { computePrice: 'PERCENTAGE', percentPrice: 20, minQuantity: 12 })],
    };
    expect(price([list], 'L', product({ listPrice: 10 }), 11)).toBe(10);
    expect(price([list], 'L', product({ listPrice: 10 }), 12)).toBe(8);
    expect(price([list], 'L', product({ listPrice: 10 }), 2, pack)).toBe(48);
  });
});

describe('findLoopThroughRule', () => {
  it('finds the loop the saved rule closes', () => {
    expect(
      findLoopThroughRule({ own: { pricelistId: 'B', basePricelistId: 'A' }, others: [{ pricelistId: 'A', basePricelistId: 'B' }] }),
    ).toEqual(['B', 'A', 'B']);
  });

  it('does not blame the saved rule for a loop elsewhere', () => {
    expect(
      findLoopThroughRule({
        own: { pricelistId: 'A', basePricelistId: 'B' },
        others: [
          { pricelistId: 'C', basePricelistId: 'D' },
          { pricelistId: 'D', basePricelistId: 'C' },
        ],
      }),
    ).toBeNull();
  });

  it('a rule based on its own pricelist is a loop', () => {
    expect(findLoopThroughRule({ own: { pricelistId: 'A', basePricelistId: 'A' }, others: [] })).toEqual(['A', 'A']);
  });
});
