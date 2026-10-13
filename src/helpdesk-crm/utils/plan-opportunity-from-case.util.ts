import { LEAD_TYPE } from 'src/crm/crm-options.constant';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';

// The opportunity a work case becomes: named after the case, for its contact, with its description, given to
// the chosen salesperson or else to whoever holds the case, and linked back to it.
export const planOpportunityFromCase = ({
  case: source,
  salespersonId,
  crmTeamId,
}: {
  case: CaseRow;
  salespersonId: string | null;
  crmTeamId: string | null;
}) => ({
  name: source.name,
  leadType: LEAD_TYPE.OPPORTUNITY,
  personId: source.personId,
  salespersonId: salespersonId ?? source.assignedUserId,
  teamId: crmTeamId,
  description: source.description,
  ticketId: source.id,
});
