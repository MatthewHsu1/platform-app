import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { twentyGraphql } from 'src/shared/twenty-graphql';
import { handleWarehouseTypeNames } from 'src/stock/warehouse/rules/warehouse-type-names';
import { type WarehouseEventRecord } from 'src/stock/warehouse/types/warehouse-event-record.type';

vi.mock('src/shared/twenty-graphql', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  twentyGraphql: vi.fn(),
}));

const graphql = vi.mocked(twentyGraphql);

type TypeRow = { id: string; name: string; warehouseId: string | null; completeName: string | null };

const connection = (rows: unknown[]) => ({
  edges: rows.map((node) => ({ node })),
  pageInfo: { hasNextPage: false, endCursor: null },
});

// Live warehouses and operation types as Twenty lists them: rows in the trash are left out.
const answer = ({ warehouses, types }: { warehouses: { id: string; name: string }[]; types: TypeRow[] }) => {
  graphql.mockImplementation((async (_access: string, query: string, variables: Record<string, unknown>) => {
    if (query.includes('stockWarehouses(')) {
      return { data: { stockWarehouses: connection(warehouses) } };
    }
    if (query.includes('stockPickingTypes(')) {
      return { data: { stockPickingTypes: connection(types) } };
    }
    return { data: { updateStockPickingType: { id: variables.id } } };
  }) as unknown as typeof twentyGraphql);
};

const writtenNames = () =>
  graphql.mock.calls
    .filter(([, query]) => query.includes('mutation Update('))
    .map(([, , variables]) => variables as { id: string; data: { completeName: string } })
    .map(({ id, data }) => [id, data.completeName]);

const event = (recordId: string) =>
  ({ recordId, properties: {} }) as unknown as ObjectRecordEvent<WarehouseEventRecord>;

describe('operation type full names follow their warehouse', () => {
  beforeEach(() => {
    graphql.mockReset();
  });

  it('names the types by themselves once their warehouse is in the trash', async () => {
    answer({
      warehouses: [],
      types: [{ id: 'receipts', name: 'Receipts', warehouseId: 'wh-1', completeName: 'San Francisco: Receipts' }],
    });

    await handleWarehouseTypeNames([event('wh-1')], 'deleted', errorCollector());

    expect(writtenNames()).toEqual([['receipts', 'Receipts']]);
  });

  it('gives the types the warehouse name back when the warehouse is restored', async () => {
    answer({
      warehouses: [{ id: 'wh-1', name: 'San Francisco' }],
      types: [{ id: 'receipts', name: 'Receipts', warehouseId: 'wh-1', completeName: 'Receipts' }],
    });

    await handleWarehouseTypeNames([event('wh-1')], 'restored', errorCollector());

    expect(writtenNames()).toEqual([['receipts', 'San Francisco: Receipts']]);
  });
});
