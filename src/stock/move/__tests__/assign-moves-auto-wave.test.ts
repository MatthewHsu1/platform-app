import { beforeEach, describe, expect, it, vi } from 'vitest';

import { autoWave } from 'src/stock-picking-batch/auto-wave';
import { db } from 'src/stock/move/__tests__/fakes/fake-records';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { planReserve } from 'src/stock/utils/plan-reserve.util';

const calls: string[] = [];

vi.mock('src/stock/stock-records', async () => (await import('src/stock/move/__tests__/fakes/fake-records')).fakeStockRecords);
vi.mock('src/stock-picking-batch/auto-wave', () => ({ autoWave: vi.fn(async () => calls.push('autoWave')) }));
vi.mock('src/stock/picking/recompute-picking-state', () => ({
  recomputePickingState: vi.fn(async () => calls.push('recomputePickingState')),
}));
vi.mock('src/stock/utils/plan-reserve.util', () => ({ planReserve: vi.fn() }));
vi.mock('src/stock/location/read-locations', () => ({
  readLocations: vi.fn(async () => new Map([['stock', { id: 'stock', parentPath: 'wh/stock/', usage: 'INTERNAL' }]])),
}));
vi.mock('src/stock/move/actions/read-origin-availability', () => ({ readOriginAvailability: vi.fn(async () => new Map()) }));
vi.mock('src/stock/move/move-links', () => ({ readMoveLinks: vi.fn(async () => ({ origsOf: new Map(), destsOf: new Map() })) }));
vi.mock('src/stock/move/recompute-move', () => ({ recomputeMove: vi.fn(async () => {}) }));
vi.mock('src/stock/package/check-entire-pack', () => ({ checkEntirePack: vi.fn(async () => {}) }));
vi.mock('src/stock/product/read-stock-products', () => ({
  readStockProducts: vi.fn(async () => new Map([['A', { productId: 'A', isStorable: true, categId: null, uomId: 'unit', displayName: 'A' }]])),
}));
vi.mock('src/stock/product/recompute-product-quantities', () => ({ recomputeProductQuantities: vi.fn(async () => {}) }));
vi.mock('src/stock/putaway/apply-putaway', () => ({ putawayDestinations: vi.fn(async () => new Map()) }));
vi.mock('src/stock/putaway/apply-putaway-strategy', () => ({ applyPutawayStrategy: vi.fn(async () => {}) }));
vi.mock('src/stock/quant/cut-back-over-reservation', () => ({ cutBackOverReservation: vi.fn(async () => ({ changedMoveIds: [] })) }));
vi.mock('src/stock/quant/recompute-reserved', () => ({ recomputeReserved: vi.fn(async () => {}) }));
vi.mock('src/stock/removal/read-removal-methods', () => ({
  readRemovalMethods: vi.fn(async () => ({ categoryMethodOf: () => null, chainOf: () => [] })),
  withRemovalRefusal: (run: () => unknown) => run(),
}));
vi.mock('src/stock/stock-uoms', () => ({ readResolvedUoms: vi.fn(async () => new Map()) }));
vi.mock('src/stock/stock-settings', () => ({
  readStockSettings: () => ({ productUnitDigits: 2 }),
  nowIso: () => '2026-10-10T12:00:00.000Z',
}));

const move = (id: string, state: string) => ({
  id,
  reference: 'WH/OUT/00001',
  state,
  picked: false,
  productId: 'A',
  productUomId: 'unit',
  productUomQty: 2,
  quantity: state === 'ASSIGNED' ? 2 : 0,
  locationId: 'stock',
  locationDestId: 'customers',
  pickingId: 'P1',
  pickingTypeId: 'out',
  procureMethod: 'MAKE_TO_STOCK',
  packagingUomId: null,
  date: '2026-10-10T00:00:00.000Z',
  priority: '0',
});
const line = (id: string, moveId: string) => ({ id, moveId, pickingId: 'P1', productId: 'A', locationId: 'stock', quantity: 2 });

describe('assignMoves and auto wave', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.mocked(autoWave).mockClear();
    vi.mocked(recomputePickingState).mockClear();
    db.reset();
    db.seed('stockPickingTypes', [
      { id: 'out', useCreateLots: false, useExistingLots: false, autoBatch: true, waveGroupByProduct: true, waveGroupByCategory: false, waveGroupByLocation: false },
    ]);
    db.seed('stockLocations', [{ id: 'stock', parentPath: 'wh/stock/' }]);
    db.seed('stockQuants', []);
  });

  it("waves every line of the moves asked for, the ready move's too, once the transfer has its new state", async () => {
    db.seed('stockMoves', [move('reserve', 'CONFIRMED'), move('ready', 'ASSIGNED')]);
    db.seed('stockMoveLines', [line('ready-line', 'ready')]);
    vi.mocked(planReserve).mockReturnValue({
      creates: [{ moveId: 'reserve', productId: 'A', locationId: 'stock', locationDestId: 'customers', quantity: 2, quantityProductUom: 2, pickingId: 'P1' }],
      grows: [],
      assigned: ['reserve'],
      partiallyAvailable: [],
      touchedKeys: [],
    } as unknown as ReturnType<typeof planReserve>);

    await assignMoves(['reserve', 'ready']);

    expect({ calls, lines: vi.mocked(autoWave).mock.calls.map(([ids]) => [...ids].sort()) }).toEqual({
      calls: ['recomputePickingState', 'autoWave'],
      lines: [['ready-line', 'stockMoveLine-new-1']],
    });
  });

  it('waves a transfer that is already ready when nothing is left to reserve', async () => {
    db.seed('stockMoves', [move('first', 'ASSIGNED'), move('second', 'ASSIGNED')]);
    db.seed('stockMoveLines', [line('first-line', 'first'), line('second-line', 'second')]);

    await assignMoves(['first', 'second']);

    expect(vi.mocked(autoWave).mock.calls.map(([ids]) => [...ids].sort())).toEqual([['first-line', 'second-line']]);
  });
});
