import { beforeEach, describe, expect, it, vi } from 'vitest';

import { twentyGraphql } from 'src/shared/twenty-graphql';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);

const QUANTITIES = { qtyAvailable: 0, freeQty: 0, incomingQty: 0, outgoingQty: 0, virtualAvailable: 0 };

// Rows Twenty answers per list; the view location's path was never filled, which the API reads as "".
const ROWS: Record<string, Record<string, unknown>[]> = {
  productProducts: [{ id: 'v1', productTmplId: 't1', ...QUANTITIES, productTmpl: { productType: 'GOODS' } }],
  stockWarehouses: [{ viewLocationId: 'view' }],
  stockLocations: [{ id: 'view', parentPath: '' }],
  stockQuants: [{ productId: 'v1', locationId: 'elsewhere', quantity: 5, reservedQuantity: 0 }],
  stockMoves: [],
  productTemplates: [{ id: 't1', ...QUANTITIES }],
};

const listOf = (query: string) => Object.keys(ROWS).find((list) => query.includes(`${list}(filter`));

describe('recomputeProductQuantities', () => {
  beforeEach(() => {
    graphql.mockReset();
    graphql.mockImplementation(async (_caller, query) => {
      const list = listOf(query);

      return list === undefined
        ? { data: {} }
        : { data: { [list]: { edges: ROWS[list].map((node) => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } } } };
    });
  });

  it('counts nothing on hand under a warehouse whose view location has an empty path', async () => {
    await recomputeProductQuantities(['v1']);

    const locationFilters = graphql.mock.calls
      .filter(([, query]) => query.includes('stockLocations(filter'))
      .map(([, , variables]) => variables?.filter);
    const updates = graphql.mock.calls.filter(([, query]) => query.includes('mutation Update'));

    expect(locationFilters).toEqual([{ id: { in: ['view'] } }]);
    expect(updates).toEqual([]);
  });
});
