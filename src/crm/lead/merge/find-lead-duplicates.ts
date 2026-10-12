import { leadDuplicatesFilter } from 'src/crm/lead/merge/utils/lead-duplicates-filter.util';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type GraphqlCaller } from 'src/shared/twenty-graphql';

// Every lead that looks like the same deal, the given lead included. Dialogs
// search with the user's rights, the assignment run with the app's.
export const findLeadDuplicates = async ({
  caller,
  ...criteria
}: {
  email: string | null;
  personId: string | null;
  companyId: string | null;
  includeLost: boolean;
  caller: GraphqlCaller;
}): Promise<LeadRow[]> => {
  const filter = leadDuplicatesFilter(criteria);

  return filter === null ? [] : queryLeads(caller, filter);
};
