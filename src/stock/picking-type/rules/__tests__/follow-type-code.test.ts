import { beforeEach, describe, expect, it, vi } from 'vitest';

import { twentyGraphql } from 'src/shared/twenty-graphql';
import { followTypeCode } from 'src/stock/picking-type/rules/follow-type-code';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);
const ANY_DELETED_AT = { or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }] };

type Sent = { query: string; variables: Record<string, unknown> };

const answer = (rows: { id: string; pickingTypeId: string; pickingTypeCode: string | null }[], failingWrites = 0) => {
  let failuresLeft = failingWrites;

  graphql.mockImplementation((async (_access: string, query: string, variables: Record<string, unknown>) => {
    if (query.includes('query Find')) {
      return {
        data: {
          stockPickings: { edges: rows.map((node) => ({ node })), pageInfo: { hasNextPage: false, endCursor: null } },
        },
      };
    }
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      return { errors: [{ message: 'timeout' }] };
    }
    const ids = ((variables.filter as { and: [{ id: { in: string[] } }] }).and[0].id.in);
    return { data: { updateStockPickings: ids.map((id) => ({ id })) } };
  }) as unknown as typeof twentyGraphql);
};

const sent = (): Sent[] =>
  graphql.mock.calls.map(([, query, variables]) => ({ query, variables: variables as Record<string, unknown> }));
const writes = () => sent().filter((call) => call.query.includes('mutation UpdateWhere'));

describe('followTypeCode', () => {
  beforeEach(() => {
    graphql.mockReset();
  });

  it('rewrites the code on every transfer of the type, done, cancelled and trashed ones included', async () => {
    answer([
      { id: 'done', pickingTypeId: 'type-1', pickingTypeCode: 'INCOMING' },
      { id: 'cancelled', pickingTypeId: 'type-1', pickingTypeCode: 'INCOMING' },
      { id: 'trashed', pickingTypeId: 'type-1', pickingTypeCode: null },
      { id: 'already-right', pickingTypeId: 'type-1', pickingTypeCode: 'INTERNAL' },
    ]);

    await followTypeCode({ id: 'type-1', code: 'INTERNAL' });

    const [read] = sent();
    expect(read.variables.filter).toEqual({ and: [{ pickingTypeId: { eq: 'type-1' } }, ANY_DELETED_AT] });
    expect(writes().map((call) => call.variables)).toEqual([
      {
        filter: { and: [{ id: { in: ['done', 'cancelled', 'trashed'] } }, ANY_DELETED_AT] },
        data: { pickingTypeCode: 'INTERNAL' },
      },
    ]);
  });

  it('writes nothing when every transfer already shows the code', async () => {
    answer([{ id: 'p1', pickingTypeId: 'type-1', pickingTypeCode: 'OUTGOING' }]);

    await followTypeCode({ id: 'type-1', code: 'OUTGOING' });

    expect(writes()).toEqual([]);
  });

  it('writes a large type in parts of 100, and a failed part does not stop the next', async () => {
    const rows = Array.from({ length: 150 }, (_, index) => ({
      id: `p${index}`,
      pickingTypeId: 'type-1',
      pickingTypeCode: 'INCOMING',
    }));
    answer(rows, 1);

    await expect(followTypeCode({ id: 'type-1', code: 'OUTGOING' })).rejects.toThrow('type-1 part 1');

    const partSizes = writes().map(
      (call) => (call.variables.filter as { and: [{ id: { in: string[] } }] }).and[0].id.in.length,
    );
    expect(partSizes).toEqual([100, 50]);
  });
});
