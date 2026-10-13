import { describe, expect, it } from 'vitest';

import { makeApplyPutawayStrategy } from 'src/stock/putaway/apply-putaway-strategy';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type PutawayStrategyLine } from 'src/stock/putaway/types/putaway-strategy-line.type';

type FakeWorld = {
  lines: PutawayStrategyLine[];
  headed: { id: string; packageDestId: string | null }[];
  packageTypes: Record<string, string | null>;
  // Where a package type goes, then where a product goes; anything else stays in the requested destination.
  packageTypeRules: Record<string, string>;
  productRules: Record<string, string>;
  // Locations that take one line only; a line counts where it goes unless the request leaves it out.
  singleLineLocations?: string[];
  // Locations that take at most this quantity of a request, in the product unit.
  capacities?: Record<string, number>;
};

const UOMS = new Map([
  ['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }],
  ['pack6', { id: 'pack6', name: 'Pack of 6', factor: 6, rootId: 'unit', parentPath: 'unit/pack6/' }],
]);

const makeFake = (world: FakeWorld) => {
  const requests: PutawayRequest[][] = [];
  const store = {
    readLines: async (ids: string[]) => world.lines.filter((line) => ids.includes(line.id)),
    readUnits: async (productIds: string[]) => ({
      productUomIds: new Map(productIds.map((productId) => [productId, 'unit'])),
      uoms: UOMS,
      digits: 2,
    }),
    readMoves: async (ids: string[]) => ids.map((id) => ({ id, locationDestId: 'stock', packagingUomId: null })),
    readHeadedPackages: async () => world.headed,
    readPackageTypes: async (ids: string[]) => new Map(ids.map((id) => [id, world.packageTypes[id] ?? null])),
    putawayDestinations: async (batch: PutawayRequest[]) => {
      requests.push(batch);
      const placed = new Map<string, string>();
      const isFull = (locationId: string, request: PutawayRequest) =>
        ((world.singleLineLocations ?? []).includes(locationId) &&
        world.lines.some(
          (row) => !(request.excludedLineIds ?? []).includes(row.id) && (placed.get(row.id) ?? row.locationDestId) === locationId,
        )) ||
        request.quantity > (world.capacities?.[locationId] ?? Number.POSITIVE_INFINITY);

      for (const request of batch) {
        const packageType = request.packageId === null ? null : (world.packageTypes[request.packageId] ?? null);
        const ruled =
          (packageType === null ? undefined : world.packageTypeRules[packageType]) ?? world.productRules[request.productId];

        placed.set(request.key, ruled !== undefined && !isFull(ruled, request) ? ruled : request.locationDestId);
      }
      return placed;
    },
    writeDestination: async (lineIds: string[], locationDestId: string) => {
      world.lines = world.lines.map((line) => (lineIds.includes(line.id) ? { ...line, locationDestId } : line));
    },
  };

  return { store, requests, world };
};

const line = (fields: Partial<PutawayStrategyLine> & { id: string }): PutawayStrategyLine => ({
  moveId: `move-${fields.id}`,
  productId: 'productA',
  quantity: 1,
  productUomId: 'unit',
  quantityProductUom: 1,
  locationDestId: 'stock',
  resultPackageId: null,
  ...fields,
});

describe('applyPutawayStrategy', () => {
  it('places each line by the package type of its outermost package', async () => {
    const fake = makeFake({
      lines: [
        line({ id: 'a', productId: 'productA', quantityProductUom: 3, resultPackageId: 'boxA' }),
        line({ id: 'b', productId: 'productB', quantityProductUom: 5, resultPackageId: 'boxB' }),
      ],
      headed: [{ id: 'boxA', packageDestId: 'pallet' }],
      packageTypes: { boxA: 'box', boxB: 'box', pallet: 'pallet' },
      packageTypeRules: { box: 'shelf1', pallet: 'shelf2' },
      productRules: {},
    });

    await makeApplyPutawayStrategy(fake.store)(['a', 'b']);

    expect(fake.world.lines.map((row) => [row.id, row.locationDestId])).toEqual([
      ['a', 'shelf2'],
      ['b', 'shelf1'],
    ]);
  });

  it('sends the lines of a package without a type back to their move destination when they would split', async () => {
    const fake = makeFake({
      lines: [
        line({ id: 'a', productId: 'productA', resultPackageId: 'bag', locationDestId: 'shelf1' }),
        line({ id: 'b', productId: 'productB', resultPackageId: 'bag', locationDestId: 'shelf1' }),
      ],
      headed: [],
      packageTypes: { bag: null },
      packageTypeRules: {},
      productRules: { productA: 'shelf1', productB: 'shelf2' },
    });

    await makeApplyPutawayStrategy(fake.store)(['a', 'b']);

    expect(fake.world.lines.map((row) => row.locationDestId)).toEqual(['stock', 'stock']);
  });

  it('places loose lines one by one by their product', async () => {
    const fake = makeFake({
      lines: [line({ id: 'a', productId: 'productA' }), line({ id: 'b', productId: 'productB' })],
      headed: [],
      packageTypes: {},
      packageTypeRules: {},
      productRules: { productB: 'shelf2' },
    });

    await makeApplyPutawayStrategy(fake.store)(['a', 'b']);

    expect(fake.world.lines.map((row) => row.locationDestId)).toEqual(['stock', 'shelf2']);
  });

  it('counts the lines already placed, but not the ones still to place', async () => {
    const fake = makeFake({
      lines: [line({ id: 'a', locationDestId: 'shelf2' }), line({ id: 'b', locationDestId: 'shelf2' })],
      headed: [],
      packageTypes: {},
      packageTypeRules: {},
      productRules: { productA: 'shelf2' },
      singleLineLocations: ['shelf2'],
    });

    await makeApplyPutawayStrategy(fake.store)(['a', 'b']);

    expect(fake.world.lines.map((row) => row.locationDestId)).toEqual(['shelf2', 'stock']);
  });

  it('weighs a line whose product-unit quantity is not written yet by its own quantity in the product unit', async () => {
    const fake = makeFake({
      lines: [
        line({ id: 'packs', productId: 'productA', quantity: 2, productUomId: 'pack6', quantityProductUom: null }),
        line({ id: 'pack', productId: 'productB', quantity: 1, productUomId: 'pack6', quantityProductUom: null }),
      ],
      headed: [],
      packageTypes: {},
      packageTypeRules: {},
      productRules: { productA: 'shelf1', productB: 'shelf1' },
      capacities: { shelf1: 10 },
    });

    await makeApplyPutawayStrategy(fake.store)(['packs', 'pack']);

    expect(fake.world.lines.map((row) => [row.id, row.locationDestId])).toEqual([
      ['packs', 'stock'],
      ['pack', 'shelf1'],
    ]);
  });
});
