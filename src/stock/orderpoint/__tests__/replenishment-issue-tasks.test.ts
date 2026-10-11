import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { type ReplenishmentIssue } from 'src/stock/orderpoint/types/replenishment-issue.type';

type Row = Record<string, unknown> & { id: string };

const tables = new Map<string, Row[]>();
const table = (plural: string) => tables.get(plural) ?? [];

// Filters as the task reads write them: `{ field: { in: [...] } }`.
const matches = (row: Row, filter: Record<string, unknown>) =>
  Object.entries(filter).every(([field, condition]) => (condition as { in: unknown[] }).in.includes(row[field]));

vi.mock('src/shared/triggers/records', () => ({
  records: (_singular: string, plural: string) => ({
    findIncludingDeleted: async (filter: Record<string, unknown>) => table(plural).filter((row) => matches(row, filter)),
    createMany: async (rows: Row[]) => {
      tables.set(plural, [...table(plural), ...rows]);
      return rows.map((row) => row.id);
    },
  }),
}));

const NO_RULE: ReplenishmentIssue = {
  productTemplateId: 'desk-template',
  productName: 'Desk',
  responsibleId: 'stock-manager',
  error: { message: 'No rule has been found to replenish "{product}" in "{location}".', values: { product: 'Desk', location: 'WH/Stock' } },
};

describe('addReplenishmentIssueTasks', () => {
  beforeEach(() => {
    tables.clear();
  });

  it('adopts the task a stopped run made before it linked it to the product, instead of making a second one', async () => {
    await addReplenishmentIssueTasks([NO_RULE]);
    const [task] = table('tasks');
    // The run stopped after the task was made and before its link to the product.
    tables.set('taskTargets', []);

    await addReplenishmentIssueTasks([NO_RULE]);

    expect({
      tasks: table('tasks').map((row) => row.id),
      targets: table('taskTargets').map((row) => ({ taskId: row.taskId, product: row.targetProductTemplateId })),
    }).toEqual({ tasks: [task.id], targets: [{ taskId: task.id, product: 'desk-template' }] });
  });
});
