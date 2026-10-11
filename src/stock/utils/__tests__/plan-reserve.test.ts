import { describe, expect, it } from 'vitest';

import { planOriginAvailability, planReserve } from 'src/stock/utils/plan-reserve.util';
import { resolveUoms } from 'src/uom/utils/uom.util';
import { type ReserveMove } from 'src/stock/utils/types/reserve-move.type';
import { type ReserveProduct } from 'src/stock/utils/types/reserve-product.type';
import { type ReserveQuant } from 'src/stock/utils/types/reserve-quant.type';

const { resolved: UOMS } = resolveUoms([
  { id: 'unit', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
  { id: 'dozen', name: 'Dozens', relativeUomId: 'unit', relativeFactor: 12, seedKey: null },
]);

const PARTIAL_PRODUCTS = new Map<string, ReserveProduct>([['A', { uomId: 'unit', packagingReserveMethod: 'PARTIAL' }]]);
const FULL_PRODUCTS = new Map<string, ReserveProduct>([['A', { uomId: 'unit', packagingReserveMethod: 'FULL' }]]);

const quant = (id: string, overrides: Partial<ReserveQuant> = {}): ReserveQuant => ({
  id,
  productId: 'A',
  locationId: 'stock',
  locationParentPath: 'wh/stock/',
  locationCompleteName: 'WH/Stock',
  ownerId: null,
  inDate: '2026-10-01T00:00:00.000Z',
  quantity: 0,
  reservedQuantity: 0,
  lotId: null,
  packageId: null,
  ...overrides,
});

const move = (id: string, overrides: Partial<ReserveMove> = {}): ReserveMove => ({
  id,
  productId: 'A',
  productUomId: 'unit',
  productUomQty: 0,
  quantity: 0,
  state: 'CONFIRMED',
  picked: false,
  procureMethod: 'MAKE_TO_STOCK',
  locationId: 'stock',
  locationParentPath: 'wh/stock/',
  locationDestId: 'customers',
  pickingId: 'out1',
  packagingUomId: null,
  bypass: false,
  originPoolKey: null,
  originAvailable: [],
  lines: [],
  ...overrides,
});

const run = (
  moves: ReserveMove[],
  quants: ReserveQuant[],
  { digits = 2, products = PARTIAL_PRODUCTS }: { digits?: number; products?: Map<string, ReserveProduct> } = {},
) => planReserve({ moves, quants, products, uoms: UOMS, digits });

const line = (moveId: string, quantity: number, overrides: Record<string, unknown> = {}) => ({
  moveId,
  productId: 'A',
  pickingId: 'out1',
  locationId: 'stock',
  locationDestId: 'customers',
  ownerId: null,
  productUomId: 'unit',
  quantity,
  quantityProductUom: quantity,
  ...overrides,
});

describe('planReserve', () => {
  it('reserves the whole demand from stock in one line', () => {
    expect(run([move('m1', { productUomQty: 100 })], [quant('q1', { quantity: 100 })])).toEqual({
      creates: [line('m1', 100)],
      grows: [],
      assigned: ['m1'],
      partiallyAvailable: [],
      touchedKeys: ['A|stock|||'],
    });
  });

  it('reserves from the first stock row whatever its owner, and the line takes that owner', () => {
    const plan = run(
      [move('m1', { productUomQty: 1 })],
      [quant('q1', { quantity: 1, ownerId: 'p1' }), quant('q2', { quantity: 1, ownerId: 'p2' })],
    );

    expect(plan.creates).toEqual([line('m1', 1, { ownerId: 'p1' })]);
    expect(plan.touchedKeys).toEqual(['A|stock|||p1']);
  });

  it('reserves what there is and leaves the move partially available', () => {
    const plan = run([move('m1', { productUomQty: 100 })], [quant('q1', { quantity: 50 })]);

    expect(plan.creates).toEqual([line('m1', 50)]);
    expect(plan.partiallyAvailable).toEqual(['m1']);
    expect(plan.assigned).toEqual([]);
  });

  it('makes the line of a receipt without touching stock', () => {
    expect(
      run([move('m1', { productUomQty: 100, bypass: true, locationId: 'vendors', locationParentPath: 'vendors/', locationDestId: 'stock', pickingId: 'in1' })], []),
    ).toEqual({
      creates: [line('m1', 100, { locationId: 'vendors', locationDestId: 'stock', pickingId: 'in1' })],
      grows: [],
      assigned: ['m1'],
      partiallyAvailable: [],
      touchedKeys: [],
    });
  });

  it('gives the older move its 5 and the next one the 3 left', () => {
    const plan = run(
      [move('m1', { productUomQty: 5 }), move('m2', { productUomQty: 5, pickingId: 'out2' })],
      [quant('q1', { quantity: 8 })],
    );

    expect(plan.creates).toEqual([line('m1', 5), line('m2', 3, { pickingId: 'out2' })]);
    expect(plan.assigned).toEqual(['m1']);
    expect(plan.partiallyAvailable).toEqual(['m2']);
  });

  it('reserves only full packagings when the category asks for it', () => {
    const first = run(
      [move('m1', { productUomQty: 26, packagingUomId: 'dozen' })],
      [quant('q1', { quantity: 15 })],
      { products: FULL_PRODUCTS },
    );
    expect(first.creates).toEqual([line('m1', 12)]);
    expect(first.partiallyAvailable).toEqual(['m1']);

    const second = run(
      [
        move('m1', {
          productUomQty: 26,
          quantity: 12,
          packagingUomId: 'dozen',
          state: 'PARTIALLY_AVAILABLE',
          lines: [
            {
              id: 'l1',
              locationId: 'stock',
              locationDestId: 'customers',
              ownerId: null,
              productUomId: 'unit',
              quantity: 12,
              quantityProductUom: 12,
              picked: false,
              pickingId: 'out1',
            },
          ],
        }),
      ],
      [quant('q1', { quantity: 115, reservedQuantity: 12 })],
      { products: FULL_PRODUCTS },
    );
    expect(second.creates).toEqual([]);
    expect(second.grows).toEqual([{ lineId: 'l1', quantity: 24, quantityProductUom: 24 }]);
    expect(second.partiallyAvailable).toEqual(['m1']);
  });

  it('never reserves part of a unit the move counts in whole numbers', () => {
    const dozen = move('m1', { productUomId: 'dozen', productUomQty: 1 });

    expect(run([dozen], [quant('q1', { quantity: 6 })], { digits: 0 })).toEqual({
      creates: [],
      grows: [],
      assigned: [],
      partiallyAvailable: [],
      touchedKeys: [],
    });
    expect(run([dozen], [quant('q1', { quantity: 12 })], { digits: 0 })).toEqual({
      creates: [line('m1', 1, { productUomId: 'dozen', quantityProductUom: 12 })],
      grows: [],
      assigned: ['m1'],
      partiallyAvailable: [],
      touchedKeys: ['A|stock|||'],
    });
  });

  it('nets negative stock under the source location before reserving', () => {
    const plan = run(
      [move('m1', { productUomQty: 4 })],
      [
        quant('q-s1', { locationId: 's1', locationParentPath: 'wh/stock/s1/', quantity: 5 }),
        quant('q-s2', { locationId: 's2', locationParentPath: 'wh/stock/s2/', quantity: -3 }),
      ],
    );

    expect(plan.creates).toEqual([line('m1', 2, { locationId: 's1' })]);
    expect(plan.partiallyAvailable).toEqual(['m1']);
    expect(plan.touchedKeys).toEqual(['A|s1|||']);
  });

  it('takes the oldest stock first', () => {
    const plan = run(
      [move('m1', { productUomQty: 4 })],
      [
        quant('q-new', { locationId: 's1', locationParentPath: 'wh/stock/s1/', inDate: '2026-03-01T00:00:00.000Z', quantity: 5 }),
        quant('q-old', { locationId: 's2', locationParentPath: 'wh/stock/s2/', inDate: '2026-01-01T00:00:00.000Z', quantity: 3 }),
      ],
    );

    expect(plan.creates).toEqual([line('m1', 3, { locationId: 's2' }), line('m1', 1, { locationId: 's1' })]);
    expect(plan.assigned).toEqual(['m1']);
  });

  it('ignores stock outside the source location', () => {
    const plan = run([move('m1', { productUomQty: 4 })], [quant('q-other', { locationId: 'other', locationParentPath: 'wh2/stock/', quantity: 9 })]);

    expect(plan.creates).toEqual([]);
    expect(plan.partiallyAvailable).toEqual([]);
  });

  it('leaves a make-to-order move to its procurement', () => {
    expect(run([move('m1', { productUomQty: 5, procureMethod: 'MAKE_TO_ORDER' })], [quant('q1', { quantity: 10 })]).creates).toEqual([]);
  });

  it('marks a move already covered as available without a new line', () => {
    expect(run([move('m1', { productUomQty: 5, quantity: 5 })], [quant('q1', { quantity: 10 })])).toMatchObject({
      creates: [],
      assigned: ['m1'],
    });
  });

  it('skips picked moves and moves that are not waiting for stock', () => {
    expect(
      run(
        [move('picked', { productUomQty: 5, picked: true }), move('draft', { productUomQty: 5, state: 'DRAFT' })],
        [quant('q1', { quantity: 10 })],
      ),
    ).toMatchObject({ creates: [], assigned: [], partiallyAvailable: [] });
  });

  it('adds to the plain line of a receipt instead of making a second one', () => {
    const plan = run(
      [
        move('m1', {
          productUomQty: 5,
          quantity: 2,
          bypass: true,
          locationId: 'vendors',
          locationParentPath: 'vendors/',
          locationDestId: 'stock',
          lines: [
            {
              id: 'l1',
              locationId: 'vendors',
              locationDestId: 'stock',
              ownerId: null,
              productUomId: 'unit',
              quantity: 2,
              quantityProductUom: 2,
              picked: false,
              pickingId: 'out1',
            },
          ],
        }),
      ],
      [],
    );

    expect(plan.grows).toEqual([{ lineId: 'l1', quantity: 5, quantityProductUom: 5 }]);
    expect(plan.creates).toEqual([]);
    expect(plan.assigned).toEqual(['m1']);
  });

  it('takes only what the original moves brought, shared with the sibling moves', () => {
    const fromUpstream = { originPoolKey: 'pick1', originAvailable: [{ locationId: 'stock', ownerId: null, quantity: 3 }] };
    const plan = run(
      [move('m1', { productUomQty: 5, ...fromUpstream }), move('m2', { productUomQty: 5, ...fromUpstream })],
      [quant('q1', { quantity: 5 })],
    );

    expect(plan.creates).toEqual([line('m1', 3)]);
    expect(plan.partiallyAvailable).toEqual(['m1']);
    expect(plan.assigned).toEqual([]);
  });
});

describe('planReserve from original moves with full packagings', () => {
  it('reserves whole dozens only of what the original moves brought', () => {
    const plan = run(
      [
        move('m1', {
          productUomQty: 26,
          packagingUomId: 'dozen',
          originPoolKey: 'pick1',
          originAvailable: [{ locationId: 'stock', ownerId: null, quantity: 30 }],
        }),
      ],
      [quant('q1', { quantity: 30 })],
      { products: FULL_PRODUCTS },
    );

    expect(plan.creates).toEqual([line('m1', 24)]);
    expect(plan.partiallyAvailable).toEqual(['m1']);
  });
});

describe('planOriginAvailability', () => {
  it('subtracts what reserved siblings hold (in place of their done lines) and what the move holds', () => {
    expect(
      planOriginAvailability({
        linesIn: [
          { locationDestId: 'stock', ownerId: null, quantityProductUom: 5 },
          { locationDestId: 'shelf', ownerId: null, quantityProductUom: 1 },
        ],
        siblingDoneLines: [
          { locationId: 'stock', ownerId: null, quantityProductUom: 1 },
          { locationId: 'shelf', ownerId: null, quantityProductUom: 1 },
        ],
        siblingReservedLines: [{ locationId: 'stock', ownerId: null, quantityProductUom: 2 }],
        ownLines: [{ locationId: 'stock', ownerId: null, quantityProductUom: 1 }],
        digits: 2,
      }),
    ).toEqual([{ locationId: 'stock', ownerId: null, quantity: 2 }]);
  });
});

const tracked = (tracking: 'SERIAL' | 'LOT') =>
  new Map<string, ReserveProduct>([['A', { uomId: 'unit', packagingReserveMethod: 'PARTIAL', tracking }]]);

describe('planReserve with lots and serials', () => {
  it('reserves a serial product one unit per line, each line on its own stock row', () => {
    const plan = run(
      [move('m1', { productUomQty: 4, usesLots: true })],
      [quant('loose', { quantity: 2 }), quant('q-lot1', { quantity: 1, lotId: 'lot1' }), quant('q-lot2', { quantity: 1, lotId: 'lot2' })],
      { products: tracked('SERIAL') },
    );

    expect(plan.creates.map((created) => [created.lotId ?? null, created.quantityProductUom])).toEqual([
      ['lot1', 1],
      ['lot2', 1],
      [null, 1],
      [null, 1],
    ]);
    expect(plan.assigned).toEqual(['m1']);
    expect(plan.touchedKeys).toEqual(['A|stock|lot1||', 'A|stock|lot2||', 'A|stock|||']);
  });

  it('makes one line per lot for a lot product', () => {
    const plan = run(
      [move('m1', { productUomQty: 3, usesLots: true })],
      [quant('q-lot1', { quantity: 2, lotId: 'lot1' }), quant('q-lot2', { quantity: 2, lotId: 'lot2' })],
      { products: tracked('LOT') },
    );

    expect(plan.creates.map((created) => [created.lotId ?? null, created.quantityProductUom])).toEqual([
      ['lot1', 2],
      ['lot2', 1],
    ]);
  });

  it('lets a lot give its stock even when the stock without a lot is below zero', () => {
    const plan = run(
      [move('m1', { productUomQty: 4, usesLots: true })],
      [quant('loose', { quantity: -3 }), quant('q-lot1', { quantity: 5, lotId: 'lot1' })],
      { products: tracked('LOT') },
    );

    expect(plan.creates).toEqual([line('m1', 4, { lotId: 'lot1' })]);
    expect(plan.assigned).toEqual(['m1']);
  });

  it('reserves nothing of a serial product when the quantity is not a whole number', () => {
    const plan = run([move('m1', { productUomQty: 2.5, usesLots: true })], [quant('loose', { quantity: 5 })], {
      products: tracked('SERIAL'),
    });

    expect(plan.creates).toEqual([]);
    expect(plan.assigned).toEqual([]);
    expect(plan.partiallyAvailable).toEqual([]);
  });
});

describe('planReserve from original moves with lots', () => {
  const atPack = { locationId: 'pack', locationParentPath: 'wh/pack/' };

  it('reserves the lot the original moves brought, not other stock at that place', () => {
    const plan = run(
      [
        move('m1', {
          ...atPack,
          productUomQty: 2,
          usesLots: true,
          originPoolKey: 'pick1',
          originAvailable: [{ locationId: 'pack', lotId: 'lot1', ownerId: null, quantity: 2 }],
        }),
      ],
      [quant('loose', { ...atPack, quantity: 5 }), quant('q-lot1', { ...atPack, quantity: 2, lotId: 'lot1' })],
      { products: tracked('LOT') },
    );

    expect(plan.creates).toEqual([line('m1', 2, { locationId: 'pack', lotId: 'lot1' })]);
    expect(plan.assigned).toEqual(['m1']);
    expect(plan.touchedKeys).toEqual(['A|pack|lot1||']);
  });

  it('gives each serial number the original moves brought its own line of one unit', () => {
    const lots = Array.from({ length: 12 }, (_, index) => `lot${index + 1}`);
    const plan = run(
      [
        move('m1', {
          ...atPack,
          productUomId: 'dozen',
          productUomQty: 1,
          usesLots: true,
          originPoolKey: 'pick1',
          originAvailable: lots.map((lotId) => ({ locationId: 'pack', lotId, ownerId: null, quantity: 1 })),
        }),
      ],
      lots.map((lotId) => quant(`q-${lotId}`, { ...atPack, quantity: 1, lotId })),
      { products: tracked('SERIAL') },
    );

    expect(plan.creates).toEqual(lots.map((lotId) => line('m1', 1, { locationId: 'pack', lotId })));
    expect(plan.assigned).toEqual(['m1']);
  });

  it('copies the lot of the original lines onto the line of a move that bypasses reservation', () => {
    const plan = run(
      [
        move('m1', {
          productUomQty: 3,
          bypass: true,
          originPoolKey: 'pick1',
          originAvailable: [{ locationId: 'pack', lotId: 'lot1', ownerId: null, quantity: 2 }],
        }),
      ],
      [],
    );

    expect(plan.creates).toEqual([line('m1', 2, { locationId: 'pack', lotId: 'lot1' }), line('m1', 1)]);
    expect(plan.assigned).toEqual(['m1']);
  });
});

describe('planOriginAvailability with lots', () => {
  it('keeps what each lot brought apart', () => {
    expect(
      planOriginAvailability({
        linesIn: [
          { locationDestId: 'pack', lotId: 'lot1', ownerId: null, quantityProductUom: 2 },
          { locationDestId: 'pack', lotId: 'lot2', ownerId: null, quantityProductUom: 1 },
        ],
        siblingDoneLines: [{ locationId: 'pack', lotId: 'lot1', ownerId: null, quantityProductUom: 1 }],
        siblingReservedLines: [],
        ownLines: [],
        digits: 2,
      }),
    ).toEqual([
      { locationId: 'pack', lotId: 'lot1', ownerId: null, quantity: 1 },
      { locationId: 'pack', lotId: 'lot2', ownerId: null, quantity: 1 },
    ]);
  });
});

const expiring = (categoryRemovalMethod: ReserveProduct['categoryRemovalMethod'] = null) =>
  new Map<string, ReserveProduct>([
    ['A', { uomId: 'unit', packagingReserveMethod: 'PARTIAL', tracking: 'LOT', useExpirationDate: true, categoryRemovalMethod }],
  ]);

describe('planReserve with expiry dates', () => {
  const shipped = '2026-10-05T00:00:00.000Z';

  it('reserves a lot that has no dates, as stock that does not perish', () => {
    const plan = run(
      [move('m1', { productUomQty: 10, usesLots: true, date: shipped })],
      [quant('q-lot1', { quantity: 100, lotId: 'lot1', removalDate: null })],
      { products: expiring() },
    );

    expect(plan.creates).toEqual([line('m1', 10, { lotId: 'lot1' })]);
    expect(plan.assigned).toEqual(['m1']);
  });

  it('skips a lot to be removed before the move date', () => {
    const plan = run(
      [move('m1', { productUomQty: 8, usesLots: true, date: shipped })],
      [
        quant('q-lot1', { quantity: 5, lotId: 'lot1', removalDate: '2026-10-01T00:00:00.000Z' }),
        quant('q-lot2', { quantity: 5, lotId: 'lot2', removalDate: '2026-10-20T00:00:00.000Z' }),
      ],
      { products: expiring() },
    );

    expect(plan.creates).toEqual([line('m1', 5, { lotId: 'lot2' })]);
    expect(plan.partiallyAvailable).toEqual(['m1']);
  });

  it('takes a lot to be removed before the move date when the product does not use expiry', () => {
    const plan = run(
      [move('m1', { productUomQty: 5, usesLots: true, date: shipped })],
      [quant('q-lot1', { quantity: 5, lotId: 'lot1', removalDate: '2026-10-01T00:00:00.000Z' })],
      { products: tracked('LOT') },
    );

    expect(plan.creates).toEqual([line('m1', 5, { lotId: 'lot1' })]);
  });

  it('prefers the stock with a lot under first expiry, first out', () => {
    const plan = run(
      [move('m1', { productUomQty: 10, usesLots: true, date: shipped })],
      [
        quant('loose', { quantity: 100, inDate: '2026-09-01T00:00:00.000Z' }),
        quant('q-lot1', { quantity: 100, lotId: 'lot1', removalDate: '2026-11-01T00:00:00.000Z' }),
      ],
      { products: expiring('FEFO') },
    );

    expect(plan.creates).toEqual([line('m1', 10, { lotId: 'lot1' })]);
  });

  it('takes the lot an original move brought even when it is to be removed before this step\'s date', () => {
    const plan = run(
      [
        move('m1', {
          productUomQty: 2,
          usesLots: true,
          date: shipped,
          locationId: 'pack',
          locationParentPath: 'wh/pack/',
          originPoolKey: 'pool',
          originAvailable: [{ locationId: 'pack', lotId: 'lot1', ownerId: null, quantity: 2 }],
        }),
      ],
      [
        quant('q-lot1', {
          quantity: 2,
          lotId: 'lot1',
          locationId: 'pack',
          locationParentPath: 'wh/pack/',
          removalDate: '2026-10-01T00:00:00.000Z',
        }),
      ],
      { products: expiring() },
    );

    expect(plan.creates).toEqual([line('m1', 2, { locationId: 'pack', lotId: 'lot1' })]);
    expect(plan.assigned).toEqual(['m1']);
  });
});
