import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from 'src/stock/move/__tests__/fakes/fake-records';
import { setMoveQuantity } from 'src/stock/move/actions/set-move-quantity';
import { type StockProduct } from 'src/stock/product/types/stock-product.type';
import type * as RemovalMethods from 'src/stock/removal/read-removal-methods';

const removal = vi.hoisted(() => ({ categoryMethod: 'FIFO' }));

vi.mock('src/stock/stock-records', async () => (await import('src/stock/move/__tests__/fakes/fake-records')).fakeStockRecords);
vi.mock('src/stock/move/recompute-move', () => ({ recomputeMove: vi.fn(async () => {}) }));
vi.mock('src/stock/picking/recompute-picking-state', () => ({ recomputePickingState: vi.fn(async () => {}) }));
vi.mock('src/stock/quant/recompute-reserved', () => ({ recomputeReserved: vi.fn(async () => {}) }));
vi.mock('src/stock/quant/cut-back-over-reservation', () => ({ cutBackOverReservation: vi.fn(async () => ({ changedMoveIds: [] })) }));
vi.mock('src/stock/putaway/apply-putaway', () => ({ putawayDestinations: vi.fn(async () => new Map()) }));
vi.mock('src/stock/stock-uoms', () => ({
  readResolvedUoms: vi.fn(async () => new Map([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]])),
}));
vi.mock('src/stock/product/read-stock-products', () => ({
  readStockProducts: vi.fn(
    async () =>
      new Map<string, Partial<StockProduct>>([
        [
          'milk',
          {
            productId: 'milk',
            isStorable: true,
            uomId: 'unit',
            categId: 'fresh',
            packagingReserveMethod: 'PARTIAL',
            tracking: 'LOT',
            useExpirationDate: true,
          },
        ],
      ]),
  ),
}));
vi.mock('src/stock/removal/read-removal-methods', async (importOriginal) => ({
  ...(await importOriginal<typeof RemovalMethods>()),
  readRemovalMethods: vi.fn(async () => ({ categoryMethodOf: () => removal.categoryMethod, chainOf: () => [] })),
}));

const move = (id: string, values: Record<string, unknown>) => ({
  id,
  state: 'CONFIRMED',
  productId: 'milk',
  productUomId: 'unit',
  pickingId: null,
  picked: false,
  packagingUomId: null,
  date: '2026-10-05T00:00:00.000Z',
  ...values,
});

const lineValues = () =>
  db.rows('stockMoveLines').map((line) => ({
    quantity: line.quantity,
    locationId: line.locationId,
    locationDestId: line.locationDestId,
    lotId: line.lotId,
  }));

describe('setMoveQuantity', () => {
  beforeEach(() => {
    removal.categoryMethod = 'FIFO';
    db.reset();
    db.seed('stockLocations', [
      { id: 'vendors', usage: 'SUPPLIER', parentPath: 'vendors/', completeName: 'Partners/Vendors' },
      { id: 'stock', usage: 'INTERNAL', parentPath: 'wh/stock/', completeName: 'WH/Stock' },
    ]);
    db.seed('stockMoves', [
      move('receipt', { state: 'ASSIGNED', locationId: 'vendors', locationDestId: 'stock' }),
      move('delivery', { locationId: 'stock', locationDestId: 'customers' }),
    ]);
    db.seed('stockQuants', [
      { id: 'q-old', productId: 'milk', locationId: 'stock', ownerId: null, lotId: 'lot1', quantity: 5, reservedQuantity: 0, inDate: '2026-09-02T00:00:00.000Z', removalDate: '2026-10-01T00:00:00.000Z' },
      { id: 'q-fresh', productId: 'milk', locationId: 'stock', ownerId: null, lotId: 'lot2', quantity: 5, reservedQuantity: 0, inDate: '2026-09-01T00:00:00.000Z', removalDate: '2026-10-20T00:00:00.000Z' },
    ]);
  });

  it('sets the quantity of a receipt even when its category names a strategy that cannot run, as a receipt takes no stock', async () => {
    removal.categoryMethod = 'RANDOM';

    await setMoveQuantity('receipt', 5);

    expect(lineValues()).toEqual([{ quantity: 5, locationId: 'vendors', locationDestId: 'stock', lotId: null }]);
  });

  it('takes a typed quantity from the lot to be removed first, even one past the move date', async () => {
    removal.categoryMethod = 'FEFO';

    await setMoveQuantity('delivery', 3);

    expect(lineValues()).toEqual([{ quantity: 3, locationId: 'stock', locationDestId: 'customers', lotId: 'lot1' }]);
  });
});
