import { beforeEach, describe, expect, it, vi } from 'vitest';

import { twentyGraphql } from 'src/shared/twenty-graphql';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);

let ROWS: Record<string, Record<string, unknown>[]> = {
  productProducts: [{ name: 'Apple' }],
  stockLocations: [{ name: 'Stock', completeName: 'WH/Stock', usage: 'INTERNAL', nextInventoryDate: null }],
  stockLots: [{ name: 'Apple Box #1', expirationDate: '2025-03-20T09:00:00.000Z', removalDate: '2025-03-18T09:00:00.000Z' }],
  stockQuants: [],
};

const listOf = (query: string) => Object.keys(ROWS).find((list) => query.includes(`${list}(filter`));

const createdQuant = () => {
  const call = graphql.mock.calls.find(([, query]) => query.includes('createStockQuants'));
  const data = call?.[2]?.data as Record<string, unknown>[] | undefined;

  return data?.[0];
};

const LOT_WITH_DATES = { name: 'Apple Box #1', expirationDate: '2025-03-20T09:00:00.000Z', removalDate: '2025-03-18T09:00:00.000Z' };

describe('graphqlQuantStore.create', () => {
  beforeEach(() => {
    ROWS = { ...ROWS, stockLots: [LOT_WITH_DATES] };
    graphql.mockReset();
    graphql.mockImplementation(async (_caller, query) => {
      if (query.includes('createStockQuants')) {
        return { data: { createStockQuants: [{ id: 'q1' }] } };
      }
      const list = listOf(query);

      return list === undefined
        ? { data: {} }
        : { data: { [list]: { edges: ROWS[list].map((node) => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } } };
    });
  });

  it('gives a new stock row of a lot the expiration and removal dates of its lot', async () => {
    await graphqlQuantStore.create('apple|stock|lot1||', { quantity: 0, reservedQuantity: 0, inDate: '2025-03-10T09:00:00.000Z' });

    expect(createdQuant()).toMatchObject({
      lotId: 'lot1',
      expirationDate: '2025-03-20T09:00:00.000Z',
      removalDate: '2025-03-18T09:00:00.000Z',
    });
  });

  it('leaves the dates of a new stock row empty when its lot has none', async () => {
    ROWS = { ...ROWS, stockLots: [{ name: 'Lot 2', expirationDate: null, removalDate: null }] };

    await graphqlQuantStore.create('apple|stock|lot2||', { quantity: 0, reservedQuantity: 0, inDate: '2025-03-10T09:00:00.000Z' });

    expect(createdQuant()).toMatchObject({ lotId: 'lot2', expirationDate: null, removalDate: null });
  });
});
