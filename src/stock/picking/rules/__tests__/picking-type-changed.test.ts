import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { twentyGraphql } from 'src/shared/twenty-graphql';
import { handlePickingTypeChanged } from 'src/stock/picking/rules/picking-type-changed';
import { type PickingEventRecord } from 'src/stock/picking/types/picking-event-record.type';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);

const staffClearsType = {
  recordId: 'p1',
  workspaceMemberId: 'member-1',
  properties: {
    before: { id: 'p1', pickingTypeId: 'deliveries', updatedBy: { source: 'MANUAL' } },
    after: { id: 'p1', pickingTypeId: null, updatedBy: { source: 'MANUAL' } },
  },
} as unknown as ObjectRecordEvent<PickingEventRecord>;

describe('handlePickingTypeChanged', () => {
  beforeEach(() => {
    graphql.mockReset();
    graphql.mockImplementation((async (_access: string, query: string) =>
      query.includes('query Find')
        ? {
            data: {
              stockPickings: {
                edges: [{ node: { id: 'p1', state: 'DRAFT', pickingTypeId: null, pickingTypeCode: 'OUTGOING' } }],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }
        : { data: { updateStockPicking: { id: 'p1' } } }) as unknown as typeof twentyGraphql);
  });

  it('clears the type of operation when staff remove the operation type', async () => {
    const errors = errorCollector();

    await handlePickingTypeChanged([staffClearsType], 'updated', errors);

    errors.throwIfAny();
    const updates = graphql.mock.calls.filter(([, query]) => query.includes('mutation Update('));
    expect(updates.map(([, , variables]) => variables)).toEqual([{ id: 'p1', data: { pickingTypeCode: null } }]);
  });
});
