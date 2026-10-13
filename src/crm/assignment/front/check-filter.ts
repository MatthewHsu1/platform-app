import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { lookupOneHop } from 'src/crm/assignment/lookup-one-hop';
import { toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

// A filter must run as a lead search before it is saved, as the clicking user.
export const checkFilter = async (query: unknown) => {
  const filter = await toTwentyFilter(query, LEAD_FILTER_CATALOGUE, lookupOneHop('person'));

  if (filter !== null) {
    await queryAsUser('query CheckFilter($filter: CrmLeadFilterInput) { crmLeads(filter: $filter, first: 1) { edges { node { id } } } }', {
      filter,
    });
  }
};
