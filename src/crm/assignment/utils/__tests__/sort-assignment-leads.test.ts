import { describe, expect, it } from 'vitest';

import { sortAllocationCandidates, sortAssignableLeads } from 'src/crm/assignment/utils/sort-assignment-leads.util';

const lead = (id: string, priority: string | null, createdAt: string) => ({ id, priority, createdAt });

describe('lead order for assignment', () => {
  it('allocates the highest priority first, then the newest', () => {
    const sorted = sortAllocationCandidates([
      lead('a', 'LOW', '2026-10-01T00:00:00.000Z'),
      lead('b', 'VERY_HIGH', '2026-09-01T00:00:00.000Z'),
      lead('c', 'LOW', '2026-10-05T00:00:00.000Z'),
      lead('d', 'HIGH', '2026-10-01T00:00:00.000Z'),
      lead('e', null, '2026-10-06T00:00:00.000Z'),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['b', 'd', 'e', 'c', 'a']);
  });

  it('assigns leads of equal probability in creation order', () => {
    expect(
      sortAssignableLeads([lead('b', null, '2026-10-02T00:00:00.000Z'), lead('a', null, '2026-10-01T00:00:00.000Z')]).map((item) => item.id),
    ).toEqual(['a', 'b']);
  });
});
