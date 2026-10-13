import { describe, expect, it } from 'vitest';

import { canBeUsed, planPutaway, planPutawayInOrder } from 'src/stock/putaway/plan-putaway';
import { type PutawayInput } from 'src/stock/putaway/types/putaway-input.type';
import { type PutawayLocation } from 'src/stock/putaway/types/putaway-location.type';
import { type PutawayRule } from 'src/stock/putaway/types/putaway-rule.type';
import { type StorageCategory } from 'src/stock/putaway/types/storage-category.type';

const location = (id: string, completeName: string, parentPath: string, values: Partial<PutawayLocation> = {}): PutawayLocation => ({
  id,
  completeName,
  parentPath,
  usage: 'INTERNAL',
  active: true,
  storageCategoryId: null,
  ...values,
});

const LOCATIONS = new Map(
  [
    location('wh', 'WH', 'wh/', { usage: 'VIEW' }),
    location('stock', 'WH/Stock', 'wh/stock/'),
    location('shelf1', 'WH/Stock/Shelf 1', 'wh/stock/shelf1/'),
    location('shelf2', 'WH/Stock/Shelf 2', 'wh/stock/shelf2/'),
    location('output', 'WH/Output', 'wh/output/'),
  ].map((row) => [row.id, row]),
);

const putawayRule = (id: string, values: Partial<PutawayRule> & Pick<PutawayRule, 'locationOutId'>): PutawayRule => ({
  id,
  productId: null,
  categoryId: null,
  packageTypeIds: [],
  storageCategoryId: null,
  sublocation: 'NO',
  ...values,
});

const storageCategory = (values: Partial<StorageCategory> = {}): StorageCategory => ({
  id: 'category',
  maxWeight: 0,
  allowNewProduct: 'MIXED',
  productCapacities: new Map(),
  packageTypeCapacities: new Map(),
  ...values,
});

const input = (values: Partial<PutawayInput> = {}): PutawayInput => ({
  destinationId: 'stock',
  productId: 'productA',
  productIds: ['productA'],
  categoryChain: [],
  quantity: 100,
  package: null,
  packagingPackageTypeId: null,
  extraQuantities: new Map(),
  candidateLocationIds: null,
  rules: [],
  locations: LOCATIONS,
  storageCategories: new Map(),
  quants: [],
  openLines: [],
  excludedLineIds: new Set(),
  productWeights: new Map(),
  lastUsedLocationIds: new Map(),
  ...values,
});

const withCategory = (categoryLocationIds: string[]) =>
  new Map([...LOCATIONS].map(([id, row]) => [id, categoryLocationIds.includes(id) ? { ...row, storageCategoryId: 'category' } : row]));

const closestRule = (values: Partial<PutawayRule> = {}) =>
  putawayRule('closest', { productId: 'productA', locationOutId: 'stock', storageCategoryId: 'category', sublocation: 'CLOSEST_LOCATION', ...values });

describe('planPutaway', () => {
  it('leaves the product in the destination when no rule fits', () => {
    expect(planPutaway(input())).toBe('stock');
  });

  it('takes the first internal location of a view destination when no rule fits', () => {
    expect(planPutaway(input({ destinationId: 'wh' }))).toBe('output');
  });

  it('stores into the rule location', () => {
    expect(planPutaway(input({ rules: [putawayRule('all', { locationOutId: 'shelf1' })] }))).toBe('shelf1');
  });

  it("prefers the product's rule, and falls back to the general rule for another product", () => {
    const rules = [putawayRule('all', { locationOutId: 'shelf1' }), putawayRule('product', { productId: 'productA', locationOutId: 'shelf2' })];

    expect(planPutaway(input({ rules }))).toBe('shelf2');
    expect(planPutaway(input({ rules: [rules[0], { ...rules[1], productId: 'consumable' }] }))).toBe('shelf1');
  });

  it("prefers the rule of the product's own category over a broader one", () => {
    const rules = [
      putawayRule('goods', { categoryId: 'goods', locationOutId: 'shelf1' }),
      putawayRule('child', { categoryId: 'child', locationOutId: 'shelf2' }),
    ];

    expect(planPutaway(input({ rules, categoryChain: ['child', 'goods'] }))).toBe('shelf2');
    expect(planPutaway(input({ rules: [rules[1], rules[0]], categoryChain: ['goods'] }))).toBe('shelf1');
  });

  it("uses a rule for the packaging's package type", () => {
    const rules = [putawayRule('crate', { packageTypeIds: ['crate'], locationOutId: 'shelf1' })];

    expect(planPutaway(input({ rules, packagingPackageTypeId: 'crate', quantity: 12 }))).toBe('shelf1');
    expect(planPutaway(input({ rules, quantity: 12 }))).toBe('stock');
  });

  it('goes where the latest done line of the product went for a last used rule', () => {
    const rules = [putawayRule('last', { locationOutId: 'stock', sublocation: 'LAST_USED' })];

    expect(planPutaway(input({ rules, lastUsedLocationIds: new Map([['last', 'shelf2']]) }))).toBe('shelf2');
    expect(planPutaway(input({ rules, lastUsedLocationIds: new Map([['last', null]]) }))).toBe('stock');
  });

  it('picks a sub-location with the storage category of the rule', () => {
    expect(
      planPutaway(
        input({
          rules: [closestRule()],
          locations: withCategory(['shelf2']),
          storageCategories: new Map([['category', storageCategory()]]),
          quants: [{ productId: 'productA', locationId: 'shelf1', quantity: 1, packageId: null, packageTypeId: null }],
        }),
      ),
    ).toBe('shelf2');
  });

  it('stops using a location whose capacity for the product is reached', () => {
    const common = {
      rules: [closestRule()],
      locations: withCategory(['shelf1']),
      storageCategories: new Map([['category', storageCategory({ productCapacities: new Map([['productA', 100]]) })]]),
    };

    expect(planPutaway(input(common))).toBe('shelf1');
    expect(
      planPutaway(
        input({
          ...common,
          openLines: [{ id: 'first', productId: 'productA', locationId: 'vendors', locationDestId: 'shelf1', quantityProductUom: 100, resultPackageId: null, resultPackageTypeId: null, isDraft: false }],
        }),
      ),
    ).toBe('stock');
  });

  it('does not count an excluded line against the capacity of the place it already sits at', () => {
    const line = { id: 'first', productId: 'productA', locationId: 'vendors', locationDestId: 'shelf1', quantityProductUom: 100, resultPackageId: null, resultPackageTypeId: null, isDraft: false };

    expect(
      planPutaway(
        input({
          rules: [closestRule()],
          locations: withCategory(['shelf1']),
          storageCategories: new Map([['category', storageCategory({ productCapacities: new Map([['productA', 100]]) })]]),
          openLines: [line],
          excludedLineIds: new Set(['first']),
        }),
      ),
    ).toBe('shelf1');
  });

  it('refuses a location that only takes new products when empty once it holds stock', () => {
    const common = { rules: [closestRule()], locations: withCategory(['shelf1']), storageCategories: new Map([['category', storageCategory({ allowNewProduct: 'EMPTY' })]]) };

    expect(planPutaway(input(common))).toBe('shelf1');
    expect(planPutaway(input({ ...common, quants: [{ productId: 'productA', locationId: 'shelf1', quantity: 100, packageId: null, packageTypeId: null }] }))).toBe('stock');
  });

  it('prefers a sub-location that already holds the product over one that comes first by name', () => {
    expect(
      planPutaway(
        input({
          rules: [closestRule()],
          locations: withCategory(['shelf1', 'shelf2']),
          storageCategories: new Map([['category', storageCategory()]]),
          quants: [{ productId: 'productA', locationId: 'shelf2', quantity: 10, packageId: null, packageTypeId: null }],
        }),
      ),
    ).toBe('shelf2');
  });

  it('refuses a same-product location with another product on its way in, even in a draft line', () => {
    const common = { rules: [closestRule()], locations: withCategory(['shelf1']), storageCategories: new Map([['category', storageCategory({ allowNewProduct: 'SAME' })]]) };
    const onItsWay = (isDraft: boolean) => ({
      id: 'other',
      productId: 'product2',
      locationId: 'vendors',
      locationDestId: 'shelf1',
      quantityProductUom: 1,
      resultPackageId: null,
      resultPackageTypeId: null,
      isDraft,
    });

    expect(planPutaway(input(common))).toBe('shelf1');
    expect(planPutaway(input({ ...common, openLines: [onItsWay(false)] }))).toBe('stock');
    expect(planPutaway(input({ ...common, openLines: [onItsWay(true)] }))).toBe('stock');
  });

  it('refuses a same-product location that holds another product', () => {
    expect(
      planPutaway(
        input({
          rules: [closestRule()],
          locations: withCategory(['shelf1']),
          storageCategories: new Map([['category', storageCategory({ allowNewProduct: 'SAME' })]]),
          quants: [{ productId: 'product2', locationId: 'shelf1', quantity: 1, packageId: null, packageTypeId: null }],
        }),
      ),
    ).toBe('stock');
  });

  it('stores a package in a sub-location with the storage category', () => {
    expect(
      planPutaway(
        input({
          rules: [closestRule({ packageTypeIds: ['box'] })],
          package: { id: 'package', packageTypeId: 'box' },
          locations: withCategory(['shelf2']),
          storageCategories: new Map([['category', storageCategory()]]),
        }),
      ),
    ).toBe('shelf2');
  });

  it('stops using a location whose capacity for the package type is reached', () => {
    const common = {
      rules: [closestRule({ packageTypeIds: ['box'] })],
      locations: withCategory(['shelf2']),
      storageCategories: new Map([['category', storageCategory({ packageTypeCapacities: new Map([['box', 1]]) })]]),
    };

    expect(planPutaway(input({ ...common, package: { id: 'package1', packageTypeId: 'box' } }))).toBe('shelf2');
    expect(
      planPutaway(
        input({
          ...common,
          package: { id: 'package2', packageTypeId: 'box' },
          quants: [{ productId: 'productA', locationId: 'shelf2', quantity: 100, packageId: 'package1', packageTypeId: 'box' }],
        }),
      ),
    ).toBe('stock');
  });

  it('stops using a location once the weight on its way reaches the maximum', () => {
    const common = {
      rules: [closestRule()],
      locations: withCategory(['shelf1']),
      storageCategories: new Map([['category', storageCategory({ maxWeight: 100 })]]),
      productWeights: new Map([['productA', 1]]),
    };

    expect(planPutaway(input(common))).toBe('shelf1');
    expect(
      planPutaway(
        input({
          ...common,
          openLines: [{ id: 'first', productId: 'productA', locationId: 'vendors', locationDestId: 'shelf1', quantityProductUom: 100, resultPackageId: null, resultPackageTypeId: null, isDraft: false }],
        }),
      ),
    ).toBe('stock');
  });
});

describe('canBeUsed', () => {
  it('counts a maximum weight of 0 as no room for a product that weighs something', () => {
    const shelf = { ...(LOCATIONS.get('shelf1') as PutawayLocation), storageCategoryId: 'category' };
    const base = input({ storageCategories: new Map([['category', storageCategory({ maxWeight: 0 })]]), productWeights: new Map([['productA', 2]]) });

    expect(canBeUsed(shelf, 1, 0, base)).toBe(false);
    expect(canBeUsed(shelf, 1, 0, { ...base, productWeights: new Map() })).toBe(true);
  });

  it('refuses a weight above the maximum, counting what is there and on its way', () => {
    const shelf = { ...(LOCATIONS.get('shelf1') as PutawayLocation), storageCategoryId: 'category' };
    const base = input({
      storageCategories: new Map([['category', storageCategory({ maxWeight: 50 })]]),
      productWeights: new Map([['productA', 10]]),
      quants: [{ productId: 'productA', locationId: 'shelf1', quantity: 2, packageId: null, packageTypeId: null }],
    });

    expect(canBeUsed(shelf, 3, 2, base)).toBe(true);
    expect(canBeUsed(shelf, 4, 2, base)).toBe(false);
  });
});

describe('planPutawayInOrder', () => {
  it('counts each line already placed in the call, where it went, when placing the next one', () => {
    const common = {
      rules: [closestRule()],
      locations: withCategory(['shelf1']),
      storageCategories: new Map([['category', storageCategory({ productCapacities: new Map([['productA', 100]]) })]]),
    };

    const placed = planPutawayInOrder([
      { key: 'first', input: input({ ...common, quantity: 60 }) },
      { key: 'second', input: input({ ...common, quantity: 60 }) },
      { key: 'third', input: input({ ...common, quantity: 40 }) },
    ]);

    expect(Object.fromEntries(placed)).toEqual({ first: 'shelf1', second: 'stock', third: 'shelf1' });
  });

  it('counts done stock placed earlier in the call as stock in its location', () => {
    const common = {
      rules: [closestRule()],
      locations: withCategory(['shelf1']),
      storageCategories: new Map([['category', storageCategory({ allowNewProduct: 'EMPTY' })]]),
      quantity: 0,
    };

    const placed = planPutawayInOrder([
      { key: 'first move', input: input(common), arrivingQuantity: 5 },
      { key: 'second move', input: input(common), arrivingQuantity: 5 },
    ]);

    expect(Object.fromEntries(placed)).toEqual({ 'first move': 'shelf1', 'second move': 'stock' });
  });
});
