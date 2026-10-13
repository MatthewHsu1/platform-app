import { describe, expect, it, vi } from 'vitest';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { type Records } from 'src/shared/triggers/records';

type Call = [string, string, unknown];

const fakeRecords = (name: string, calls: Call[], rows: Record<string, unknown>[] = []) => {
  const matching = async (filter: Record<string, { in: string[] }>) => {
    const [field, condition] = Object.entries(filter)[0];

    return rows.filter((row) => condition.in.includes(row[field] as string));
  };

  return {
    objectSingular: name,
    objectPlural: `${name}s`,
    find: vi.fn(matching),
    findIncludingDeleted: vi.fn(matching),
    updateMany: vi.fn(async (ids: string[], data: unknown) => {
      calls.push([name, `update ${ids.join(',')}`, data]);
    }),
    softDeleteMany: vi.fn(async (ids: string[]) => {
      calls.push([name, `softDelete ${ids.join(',')}`, null]);
      return ids;
    }),
    destroyMany: vi.fn(async (ids: string[]) => {
      calls.push([name, `destroy ${ids.join(',')}`, null]);
      return ids;
    }),
  } as unknown as Records;
};

describe('applyDeleteRules', () => {
  it('clears references, then deletes children, then destroys link rows, for records still deleted', async () => {
    const calls: Call[] = [];
    const parents = fakeRecords('category', calls, [
      { id: 'c1', deletedAt: '2026-10-09T10:00:00.000Z' },
      { id: 'c2', deletedAt: null },
    ]);
    const cases = fakeRecords('case', calls, [
      { id: 'k1', categoryId: 'c1' },
      { id: 'k2', categoryId: 'c2' },
    ]);
    const children = fakeRecords('child', calls, [{ id: 'c3', parentId: 'c1' }]);
    const links = fakeRecords('link', calls, [
      { id: 'l1', categoryId: 'c1' },
      { id: 'l2', categoryId: 'c2' },
    ]);

    await applyDeleteRules(
      parents,
      {
        references: [{ of: cases, field: 'categoryId' }],
        cascades: [{ of: children, field: 'parentId' }],
        links: [{ of: links, field: 'categoryId' }],
      },
      ['c1', 'c2'],
    );

    expect(calls.map(([name, action]) => `${name} ${action}`)).toEqual(['case update k1', 'child softDelete c3', 'link destroy l1']);
    expect(calls[0][2]).toEqual({ categoryId: null });
  });

  it('does nothing when every record was restored meanwhile', async () => {
    const calls: Call[] = [];
    const parents = fakeRecords('stage', calls, [{ id: 's1', deletedAt: null }]);
    const links = fakeRecords('link', calls, [{ id: 'l1', stageId: 's1' }]);

    await applyDeleteRules(parents, { references: [], cascades: [], links: [{ of: links, field: 'stageId' }] }, ['s1']);

    expect(calls).toEqual([]);
  });
});
