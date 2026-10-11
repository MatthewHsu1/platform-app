import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findMany, records } from 'src/shared/triggers/records';
import { twentyGraphql } from 'src/shared/twenty-graphql';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);
const moves = records('stockMove', 'stockMoves');

describe('records find', () => {
  beforeEach(() => {
    graphql.mockReset();
    graphql.mockResolvedValue({
      data: { stockMoves: { edges: [{ node: { id: 'm1' } }], pageInfo: { hasNextPage: false, endCursor: null } } },
    });
  });

  // Twenty refuses `in: []` ("Invalid filter value for field id. Expected non-empty array"); an empty set matches nothing.
  it('answers no rows without a request when a field must be in an empty list', async () => {
    expect(await moves.find({ id: { in: [] } }, 'id')).toEqual([]);
    expect(await moves.find({ and: [{ pickingId: { eq: 'p1' } }, { id: { in: [] } }] }, 'id')).toEqual([]);
    expect(await moves.findIncludingDeleted({ pickingId: { in: [] } }, 'id')).toEqual([]);
    expect(graphql).not.toHaveBeenCalled();
  });

  it('drops an or branch that needs an empty list and sends the rest', async () => {
    await moves.find({ or: [{ id: { in: [] } }, { pickingId: { eq: 'p1' } }] }, 'id');
    expect(graphql.mock.calls[0][2]).toEqual({ filter: { or: [{ pickingId: { eq: 'p1' } }] }, after: null });
  });

  it('answers no rows when every or branch needs an empty list', async () => {
    expect(await moves.find({ or: [{ id: { in: [] } }, { pickingId: { in: [] } }] }, 'id')).toEqual([]);
    expect(graphql).not.toHaveBeenCalled();
  });

  it('prunes an or nested in an and, and answers no rows when it empties', async () => {
    await moves.find({ and: [{ state: { eq: 'draft' } }, { or: [{ id: { in: [] } }, { pickingId: { eq: 'p1' } }] }] }, 'id');
    expect(graphql.mock.calls[0][2]).toEqual({
      filter: { and: [{ state: { eq: 'draft' } }, { or: [{ pickingId: { eq: 'p1' } }] }] },
      after: null,
    });
    graphql.mockClear();
    expect(await moves.find({ and: [{ state: { eq: 'draft' } }, { or: [{ id: { in: [] } }] }] }, 'id')).toEqual([]);
    expect(graphql).not.toHaveBeenCalled();
  });

  it('sends a filter that excludes an empty list, which matches every row', async () => {
    const filter = { not: { id: { in: [] } } };
    expect(await moves.find(filter, 'id')).toEqual([{ id: 'm1' }]);
    expect(graphql.mock.calls[0][2]).toEqual({ filter, after: null });
  });

  it('sends a filter whose lists are not empty', async () => {
    expect(await moves.find({ id: { in: ['m1'] } }, 'id')).toEqual([{ id: 'm1' }]);
    expect(graphql).toHaveBeenCalledTimes(1);
  });

  // Twenty's API answers "" for a TEXT field whose column is NULL.
  it('reads an empty text field as no value, with or without deleted rows', async () => {
    graphql.mockResolvedValue({
      data: {
        stockMoves: {
          edges: [{ node: { id: 'm1', origin: '', procurementRun: '', name: 'WH/IN/00001' } }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const expected = [{ id: 'm1', origin: null, procurementRun: null, name: 'WH/IN/00001' }];

    expect(await moves.find({ id: { eq: 'm1' } }, 'id origin procurementRun name')).toEqual(expected);
    expect(await moves.findIncludingDeleted({ id: { eq: 'm1' } }, 'id origin procurementRun name')).toEqual(expected);
  });
});

describe('findMany', () => {
  beforeEach(() => {
    graphql.mockReset();
    graphql.mockResolvedValue({
      data: { moves: { edges: [{ node: { id: 'm1' } }], pageInfo: { hasNextPage: false, endCursor: null } } },
    });
  });

  it('answers an empty list for a filter that needs an empty list and leaves it out of the request', async () => {
    const pickings = records('stockPicking', 'stockPickings');
    const result = await findMany<{ moves: unknown[]; pickings: unknown[] }>({
      moves: { of: moves, filter: { id: { in: ['m1'] } }, selection: 'id' },
      pickings: { of: pickings, filter: { id: { in: [] } }, selection: 'id' },
    });
    expect(result).toEqual({ moves: [{ id: 'm1' }], pickings: [] });
    expect(graphql.mock.calls[0][2]).toEqual({ moves: { id: { in: ['m1'] } } });
  });

  it('reads an empty text field as no value', async () => {
    graphql.mockResolvedValue({
      data: {
        moves: {
          edges: [{ node: { id: 'm1', origin: '', reference: 'WH/IN/00001' } }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    const result = await findMany<{ moves: unknown[] }>({
      moves: { of: moves, filter: { id: { in: ['m1'] } }, selection: 'id origin reference' },
    });
    expect(result).toEqual({ moves: [{ id: 'm1', origin: null, reference: 'WH/IN/00001' }] });
  });
});
