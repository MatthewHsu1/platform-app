import { describe, expect, it } from 'vitest';

import { makeCountLeads } from 'src/sales-team/front-components/count-leads';

// Twenty answers a query that names the same root field twice, even under two
// aliases, with this error.
const DUPLICATE_ROOT = 'Duplicate root resolver: "crmLeads"';

const twentyLike = (totals: Record<string, number>) => {
  const queries: string[] = [];
  const query = async <TData>(text: string, variables?: Record<string, unknown>): Promise<TData> => {
    queries.push(text);
    if ((text.match(/crmLeads\(/g) ?? []).length > 1) {
      throw new Error(DUPLICATE_ROOT);
    }
    const [alias] = text.match(/(\w+): crmLeads\(/)?.slice(1) ?? ['crmLeads'];
    const filter = JSON.stringify(Object.values(variables ?? {})[0]);

    return { [alias]: { totalCount: totals[filter] ?? 0 } } as TData;
  };

  return { query, queries };
};

describe('countLeads', () => {
  it('counts each filter in a request of its own, as Twenty refuses the same list twice in one query', async () => {
    const twenty = twentyLike({ [JSON.stringify({ teamId: { eq: 't' } })]: 7, [JSON.stringify({ salespersonId: { is: 'NULL' } })]: 3 });

    const counts = await makeCountLeads(twenty.query)({
      open: { teamId: { eq: 't' } },
      unassigned: { salespersonId: { is: 'NULL' } },
    });

    expect(counts).toEqual({ open: 7, unassigned: 3 });
    expect(twenty.queries).toHaveLength(2);
  });
});
