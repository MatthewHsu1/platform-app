import { CASE_DELETE_RULES } from 'src/helpdesk/delete-rules/case-delete-rules';
import { records } from 'src/shared/triggers/records';

const related = records('helpdeskTicketRelated', 'helpdeskTicketRelateds');

// A deleted case leaves no related link on either side.
CASE_DELETE_RULES.links.push({ of: related, field: 'ticketId' }, { of: related, field: 'relatedTicketId' });
