import { CASE_DELETE_RULES } from 'src/helpdesk/delete-rules/case-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted case leaves the cases that name it as their original, and loses its tag links.
CASE_DELETE_RULES.references.push({ of: records('helpdeskTicket', 'helpdeskTickets'), field: 'duplicateId' });
CASE_DELETE_RULES.links.push({ of: records('helpdeskTicketTagRel', 'helpdeskTicketTagRels'), field: 'ticketId' });
