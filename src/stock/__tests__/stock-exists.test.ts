import { beforeEach, describe, expect, it, vi } from 'vitest';

import { twentyGraphql } from 'src/shared/twenty-graphql';
import { anyRowWhere, findSome } from 'src/stock/stock-exists';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);

describe('stock-exists', () => {
  beforeEach(() => {
    graphql.mockReset();
    graphql.mockResolvedValue({ data: { stockPickings: { edges: [{ node: { id: 'p1' } }] } } });
  });

  it('answers no rows without a request when a field must be in an empty list', async () => {
    expect(await findSome('stockPicking', 'stockPickings', { pickingTypeId: { in: [] } }, 'id')).toEqual([]);
    expect(await anyRowWhere('stockPicking', 'stockPickings', { pickingTypeId: { in: [] } })).toBe(false);
    expect(graphql).not.toHaveBeenCalled();
  });

  it('sends a filter whose lists are not empty', async () => {
    expect(await anyRowWhere('stockPicking', 'stockPickings', { pickingTypeId: { in: ['t1'] } })).toBe(true);
    expect(graphql).toHaveBeenCalledTimes(1);
  });

  it('reads an empty text field as no value', async () => {
    graphql.mockResolvedValue({ data: { stockPickings: { edges: [{ node: { id: 'p1', origin: '' } }] } } });
    expect(await findSome('stockPicking', 'stockPickings', { id: { eq: 'p1' } }, 'id origin')).toEqual([
      { id: 'p1', origin: null },
    ]);
  });
});
