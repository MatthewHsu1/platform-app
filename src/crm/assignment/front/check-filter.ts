import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { lookupOneHop } from 'src/crm/assignment/lookup-one-hop';
import { toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

// The stored text for a query: an empty query is no filter.
export const filterText = (query: unknown) =>
  query !== null &&
  typeof query === 'object' &&
  Array.isArray((query as { rules?: unknown[] }).rules) &&
  (query as { rules: unknown[] }).rules.length > 0
    ? JSON.stringify(query)
    : null;

// A filter must run as a lead search before it is saved, as the clicking user.
export const checkFilter = async (query: unknown) => {
  const filter = await toTwentyFilter(query, LEAD_FILTER_CATALOGUE, lookupOneHop('person'));

  if (filter !== null) {
    await queryAsUser('query CheckFilter($filter: CrmLeadFilterInput) { crmLeads(filter: $filter, first: 1) { edges { node { id } } } }', {
      filter,
    });
  }
};

// The stored filter as the editor reads it. Text that is not a query opens
// as an empty editor and is marked, so the user knows a save replaces it.
export const parseStoredFilter = (text: string | null): { value: unknown; unreadable: boolean } => {
  if (text === null || text.trim() === '') {
    return { value: null, unreadable: false };
  }
  try {
    return { value: JSON.parse(text) as unknown, unreadable: false };
  } catch {
    return { value: null, unreadable: true };
  }
};
