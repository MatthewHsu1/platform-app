import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { CASE_DELETE_RULES } from 'src/helpdesk/delete-rules/case-delete-rules';

// A deleted work case leaves the service orders made for it.
CASE_DELETE_RULES.references.push({ of: fsmOrders, field: 'ticketId' });
