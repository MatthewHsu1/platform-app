import { describe, expect, it } from 'vitest';

import { makeGenerateLotLines } from 'src/stock/lot/actions/generate-lot-lines';
import { type GenerateLotLinesStore } from 'src/stock/lot/types/generate-lot-lines-store.type';
import { type MoveForLots } from 'src/stock/lot/types/move-for-lots.type';

type StoredLine = { data: Record<string, unknown>; expirationDate: string | null };

const MOVE: MoveForLots = {
  id: 'move-1',
  state: 'ASSIGNED',
  productId: 'product-1',
  productUomId: 'unit',
  locationId: 'supplier',
  locationDestId: 'stock',
  pickingId: 'picking-1',
  productQty: 150,
  product: {
    productTmpl: {
      uomId: 'unit',
      tracking: 'SERIAL',
      useExpirationDate: true,
      expirationTime: 2,
      lotSequence: null,
    },
  },
  pickingType: { useExistingLots: false },
  picking: { scheduledDate: '2020-06-01T00:00:00.000Z', pickingType: { useExistingLots: false } },
};

// One move with one line made by the reservation; a create call can be made to fail.
const makeFakeStore = ({ failOnCreateCall }: { failOnCreateCall?: number } = {}) => {
  const lines = new Map<string, StoredLine>([
    ['old-line', { data: { moveId: MOVE.id, quantity: 150 }, expirationDate: null }],
  ]);
  const created: string[] = [];
  const written: string[] = [];
  let createCalls = 0;

  const store: GenerateLotLinesStore = {
    readMove: async () => MOVE,
    readDateOrder: async () => 'MONTH_FIRST',
    readOpenLineIds: async (moveId) => [...lines].filter(([, line]) => line.data.moveId === moveId).map(([id]) => id),
    putawayDestinations: async (requests) => new Map(requests.map((request) => [request.key, request.locationDestId])),
    lotIdsByName: async () => new Map(),
    deleteLines: async (lineIds) => {
      lineIds.forEach((id) => lines.delete(id));
    },
    createMissingLines: async (rows) => {
      createCalls += 1;
      if (createCalls === failOnCreateCall) {
        throw new Error('server stopped');
      }
      const missing = rows.filter((row) => !lines.has(row.id));

      missing.forEach((row) => lines.set(row.id, { data: row.data, expirationDate: null }));
      created.push(...missing.map((row) => row.id));
      return missing.map((row) => row.id);
    },
    readExpirationDates: async (lineIds) => new Map(lineIds.map((id) => [id, lines.get(id)?.expirationDate ?? null])),
    writeExpirationDate: async (lineIds, expirationDate) => {
      lineIds.forEach((id) => {
        const line = lines.get(id);

        if (line !== undefined) {
          line.expirationDate = expirationDate;
          written.push(id);
        }
      });
    },
    jumpSequence: async () => undefined,
    now: () => new Date('2020-06-01T15:00:00.000Z'),
  };

  return { store, lines, created, written };
};

const body = { moveId: MOVE.id, runId: 'run-1', mode: 'GENERATE', firstLot: 'SN001', count: 150 };

const snapshot = (lines: Map<string, StoredLine>) => [...lines].sort(([left], [right]) => left.localeCompare(right));

describe('generateLotLines', () => {
  it('ends with the lines of a clean run when a run stopped after its first lines and is clicked again', async () => {
    const clean = makeFakeStore();

    await makeGenerateLotLines(clean.store)({ ...body, keepLines: false });

    const stopped = makeFakeStore({ failOnCreateCall: 2 });
    const generate = makeGenerateLotLines(stopped.store);

    await expect(generate({ ...body, keepLines: false })).rejects.toThrow('server stopped');
    await generate({ ...body, keepLines: true });

    expect(clean.lines.size).toBe(150);
    expect(snapshot(stopped.lines)).toEqual(snapshot(clean.lines));
  });

  it('makes nothing the second time the same run is sent', async () => {
    const fake = makeFakeStore();
    const generate = makeGenerateLotLines(fake.store);

    await generate({ ...body, keepLines: false });
    const after = snapshot(fake.lines);
    const createdBefore = fake.created.length;
    const writtenBefore = fake.written.length;

    await generate({ ...body, keepLines: false });

    expect(fake.created.length).toBe(createdBefore);
    expect(fake.written.length).toBe(writtenBefore);
    expect(snapshot(fake.lines)).toEqual(after);
  });
});
