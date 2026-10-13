import { queryAsUser } from 'src/shared/front-components/query-as-user';

const DAY_MS = 24 * 60 * 60 * 1000;

type Query = <TData>(query: string, variables?: Record<string, unknown>) => Promise<TData>;

export const daysAgo = (days: number): string => new Date(Date.now() - days * DAY_MS).toISOString();

// Counts several lead filters as the signed-in user, so a lead the row rule
// hides is not counted. Twenty refuses the same list twice in one query, even
// under two aliases, so each filter goes in a request of its own.
export const makeCountLeads =
  (query: Query) =>
  async <TKey extends string>(filters: Record<TKey, Record<string, unknown>>): Promise<Record<TKey, number>> => {
    const keys = Object.keys(filters) as TKey[];
    const totals = await Promise.all(
      keys.map(async (key) => {
        const data = await query<{ crmLeads: { totalCount: number } }>(
          'query CountLeads($filter: CrmLeadFilterInput) { crmLeads(filter: $filter) { totalCount } }',
          { filter: filters[key] },
        );

        return [key, data.crmLeads.totalCount] as const;
      }),
    );

    return Object.fromEntries(totals) as Record<TKey, number>;
  };

export const countLeads = makeCountLeads(queryAsUser);
