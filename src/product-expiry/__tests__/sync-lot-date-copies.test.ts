import { describe, expect, it } from 'vitest';

import { makeSyncLotDateCopies } from 'src/product-expiry/sync-lot-date-copies';
import { type LotQuant } from 'src/product-expiry/utils/types/lot-quant.type';

const quant: LotQuant = {
  id: 'q',
  quantKey: 'apple|stock|lot||',
  lotId: 'lot',
  quantity: 10,
  reservedQuantity: 0,
  inDate: '2025-03-01T00:00:00.000Z',
  version: 4,
  inventoryQuantitySet: false,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  expirationDate: null,
  removalDate: null,
  useExpirationDate: true,
};

const fakeStore = (compareAndSetAnswers: (call: number) => boolean) => {
  const calls = { reads: 0, writes: [] as { id: string; version: number }[], waits: 0, lineSettles: [] as string[][] };

  return {
    calls,
    store: {
      readLotsAndQuants: async () => {
        calls.reads += 1;
        return { lots: [{ id: 'lot', expirationDate: '2025-03-12T09:00:00.000Z', removalDate: null }], quants: [quant] };
      },
      compareAndSet: async (id: string, version: number) => {
        calls.writes.push({ id, version });
        return compareAndSetAnswers(calls.writes.length);
      },
      settleLotLineDates: async (lotIds: string[]) => {
        calls.lineSettles.push(lotIds);
      },
      wait: async () => {
        calls.waits += 1;
      },
      now: () => '2025-03-10T09:00:00.000Z',
      digits: () => 2,
    },
  };
};

describe('syncLotDateCopies', () => {
  it('reads the rows again after a missed write and finishes when the next write lands', async () => {
    const { store, calls } = fakeStore((call) => call > 1);

    await makeSyncLotDateCopies(store)(['lot', 'lot']);

    expect(calls.reads).toBe(2);
    expect(calls.writes).toHaveLength(2);
    expect(calls.waits).toBe(1);
    expect(calls.lineSettles).toEqual([['lot']]);
  });

  it('gives up after four reads of a row that keeps changing, and still settles the lines', async () => {
    const { store, calls } = fakeStore(() => false);

    await expect(makeSyncLotDateCopies(store)(['lot'])).rejects.toThrow('1 stock rows of the lot kept changing');

    expect(calls.reads).toBe(4);
    expect(calls.lineSettles).toEqual([['lot']]);
  });

  it('does nothing for no lots', async () => {
    const { store, calls } = fakeStore(() => true);

    await makeSyncLotDateCopies(store)([]);

    expect(calls.reads).toBe(0);
    expect(calls.lineSettles).toEqual([]);
  });
});
