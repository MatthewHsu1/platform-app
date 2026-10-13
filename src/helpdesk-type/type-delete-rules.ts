import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { records } from 'src/shared/triggers/records';

// A deleted type leaves its cases and its team links.
export const TYPE_DELETE_RULES: DeleteRules = {
  references: [{ of: records('helpdeskTicket', 'helpdeskTickets'), field: 'ticketTypeId' }],
  cascades: [],
  links: [{ of: records('helpdeskTicketTypeTeam', 'helpdeskTicketTypeTeams'), field: 'ticketTypeId' }],
};
