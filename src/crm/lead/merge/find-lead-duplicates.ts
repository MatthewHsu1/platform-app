import { groupEmailDuplicates } from 'src/crm/lead/merge/utils/group-email-duplicates.util';
import { duplicateEmailsOf, leadDuplicatesFilter } from 'src/crm/lead/merge/utils/lead-duplicates-filter.util';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type GraphqlCaller } from 'src/shared/twenty-graphql';
import { chunks } from 'src/shared/utils/chunks.util';

const DUPLICATE_SEARCH_CHUNK = 100;

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

// The open leads sharing an address with each of these leads, one search per
// hundred leads instead of one a lead.
export const findEmailDuplicatesOfMany = async (leads: LeadRow[], caller: GraphqlCaller): Promise<Map<string, string[]>> => {
  const groups = new Map<string, string[]>();

  for (const part of chunks(leads, DUPLICATE_SEARCH_CHUNK)) {
    const emails = [...new Set(part.flatMap((lead) => duplicateEmailsOf(lead.emailFrom?.primaryEmail ?? null)))];
    const filter = leadDuplicatesFilter({ email: null, emails, personId: null, companyId: null, includeLost: false });
    const found = filter === null ? [] : await queryLeads(caller, filter);

    groupEmailDuplicates(part, found).forEach((ids, leadId) => groups.set(leadId, ids));
  }
  return groups;
};
