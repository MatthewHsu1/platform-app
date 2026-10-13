import { describe, expect, it } from 'vitest';

import { makeRunLotExpiryStep } from 'src/product-expiry/daily/lot-expiry-step';
import { type AlertLot } from 'src/product-expiry/types/alert-lot.type';
import { type LotExpiryStepStore } from 'src/product-expiry/types/lot-expiry-step-store.type';
import { type ExpiringQuant } from 'src/product-expiry/utils/types/expiring-quant.type';

const now = new Date('2025-03-10T09:00:00.000Z');

const quant = (fields: Partial<ExpiringQuant>): ExpiringQuant => ({
  id: 'q1',
  quantKey: 'apple|stock',
  productId: 'apple',
  quantity: 12,
  reservedQuantity: 3,
  availableQuantity: 9,
  inDate: '2025-03-01T00:00:00.000Z',
  version: 4,
  inventoryQuantitySet: false,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  removalDate: '2025-03-09T08:00:00.000Z',
  useExpirationDate: true,
  ...fields,
});

const fakeStore = ({
  lots = [],
  stocked = [],
  lotsToFlag = [],
  quants = [],
  productsWithExpiredStock = [],
  missFirstWriteOf = null,
  alwaysMiss = false,
}: {
  lots?: AlertLot[];
  stocked?: string[];
  lotsToFlag?: string[];
  quants?: ExpiringQuant[];
  productsWithExpiredStock?: string[];
  missFirstWriteOf?: string | null;
  alwaysMiss?: boolean;
}) => {
  const state = { lots: [...lots], quants: [...quants] };
  const calls = {
    tasks: [] as Parameters<LotExpiryStepStore['addLotTask']>[0][],
    flagged: [] as string[][],
    writes: [] as { id: string; version: number; data: Record<string, unknown> }[],
    attempts: 0,
    recomputed: [] as string[],
  };
  let missed = false;
  const store: LotExpiryStepStore = {
    readAlertLots: async (cutoff) =>
      state.lots.filter((lot) => !lot.productExpiryReminded && lot.alertDate !== null && lot.alertDate <= cutoff),
    readStockedLotIds: async (lotIds) => new Set(stocked.filter((id) => lotIds.includes(id))),
    addLotTask: async (task) => {
      calls.tasks.push(task);
    },
    markReminded: async (lotId) => {
      state.lots = state.lots.map((lot) => (lot.id === lotId ? { ...lot, productExpiryReminded: true } : lot));
    },
    readLotsToFlag: async () => lotsToFlag,
    recomputeLotExpiry: async (lotIds) => {
      calls.flagged.push(lotIds);
    },
    readStaleQuants: async () => state.quants.filter((row) => row.availableQuantity !== 0),
    writeQuant: async (write) => {
      calls.attempts += 1;
      // Another writer moves the row first: its version goes up, its available quantity stays stale.
      if (alwaysMiss || (write.id === missFirstWriteOf && !missed)) {
        missed = true;
        state.quants = state.quants.map((row) => (row.id === write.id ? { ...row, version: row.version + 1 } : row));
        return false;
      }
      calls.writes.push(write);
      state.quants = state.quants.map((row) =>
        row.id === write.id ? { ...row, availableQuantity: write.data.availableQuantity as number, version: row.version + 1 } : row,
      );
      return true;
    },
    readProductsWithExpiredStock: async () => productsWithExpiredStock,
    recomputeProductQuantities: async (productIds) => {
      calls.recomputed.push(...productIds);
    },
    digits: () => 2,
    wait: async () => {},
  };

  return { store, calls };
};

describe('runLotExpiryStep', () => {
  const lots: AlertLot[] = [
    { id: 'past', alertDate: '2025-02-23T00:00:00.000Z', productExpiryReminded: false, responsibleId: 'repa' },
    { id: 'ahead', alertDate: '2025-03-25T00:00:00.000Z', productExpiryReminded: false, responsibleId: 'repa' },
    { id: 'none', alertDate: null, productExpiryReminded: false, responsibleId: null },
  ];

  it('makes one task for a stocked lot whose alert date has come, once, for the product responsible', async () => {
    const { store, calls } = fakeStore({ lots, stocked: ['past', 'ahead', 'none'] });
    const run = makeRunLotExpiryStep(store);

    await run(now);
    await run(new Date('2025-03-11T09:00:00.000Z'));

    expect(calls.tasks).toEqual([
      {
        id: expect.any(String),
        lotId: 'past',
        title: 'Alert Date Reached',
        body: 'The alert date has been reached for this lot/serial number',
        assigneeId: 'repa',
        dueAt: '2025-03-10T09:00:00.000Z',
      },
    ]);
  });

  it('flags the lots whose expiration date has passed', async () => {
    const { store, calls } = fakeStore({ lotsToFlag: ['old'] });

    await makeRunLotExpiryStep(store)(now);

    expect(calls.flagged).toEqual([['old']]);
  });

  it('brings expired stock rows to 0 available, even after a missed day, and recomputes their products', async () => {
    const { store, calls } = fakeStore({
      quants: [
        quant({}),
        quant({ id: 'q2', productId: 'pear', removalDate: '2025-03-01T00:00:00.000Z', quantity: 5, reservedQuantity: 0, availableQuantity: 5, version: 1 }),
      ],
      productsWithExpiredStock: ['plum'],
    });

    await makeRunLotExpiryStep(store)(now);

    expect(calls.writes).toEqual([
      { id: 'q1', version: 4, data: { availableQuantity: 0, version: 5 } },
      { id: 'q2', version: 1, data: { availableQuantity: 0, version: 2 } },
    ]);
    expect([...calls.recomputed].sort()).toEqual(['apple', 'pear', 'plum']);
  });

  it('writes a stock row again when another writer moved it in between', async () => {
    const { store, calls } = fakeStore({ quants: [quant({})], missFirstWriteOf: 'q1' });

    await makeRunLotExpiryStep(store)(now);

    expect(calls.writes).toEqual([{ id: 'q1', version: 5, data: { availableQuantity: 0, version: 6 } }]);
  });

  it('gives up on a stock row that keeps changing after four tries and reports it', async () => {
    const { store, calls } = fakeStore({ quants: [quant({})], alwaysMiss: true });

    await expect(makeRunLotExpiryStep(store)(now)).rejects.toThrow(
      '1 expired stock rows kept changing while their available quantity was written.',
    );
    expect(calls.attempts).toBe(4);
  });
});
