import { queryAsUser } from 'src/shared/front-components/query-as-user';

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysAgo = (days: number): string => new Date(Date.now() - days * DAY_MS).toISOString();

// One request counts several lead filters; it runs as the signed-in user, so a
// lead the row rule hides is not counted.
export const countLeads = async <TKey extends string>(filters: Record<TKey, Record<string, unknown>>): Promise<Record<TKey, number>> => {
  const keys = Object.keys(filters) as TKey[];
  const variables = Object.fromEntries(keys.map((key) => [`filter_${key}`, filters[key]]));
  const declarations = keys.map((key) => `$filter_${key}: CrmLeadFilterInput`).join(', ');
  const selections = keys.map((key) => `${key}: crmLeads(filter: $filter_${key}) { totalCount }`).join('\n');
  const data = await queryAsUser<Record<TKey, { totalCount: number }>>(`query CountLeads(${declarations}) { ${selections} }`, variables);

  return Object.fromEntries(keys.map((key) => [key, data[key].totalCount])) as Record<TKey, number>;
};
