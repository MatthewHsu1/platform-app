import { CATEGORY_DELETE_RULES } from 'src/helpdesk/delete-rules/category-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted category leaves its cases, takes its child categories with it, and loses its team links.
CATEGORY_DELETE_RULES.references.push({ of: records('helpdeskTicket', 'helpdeskTickets'), field: 'categoryId' });
CATEGORY_DELETE_RULES.cascades.push({ of: records('helpdeskTicketCategory', 'helpdeskTicketCategories'), field: 'parentId' });
CATEGORY_DELETE_RULES.links.push({ of: records('helpdeskTicketTeamCategory', 'helpdeskTicketTeamCategories'), field: 'categoryId' });
