import { TAG_DELETE_RULES } from 'src/helpdesk/delete-rules/tag-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted tag leaves the cases that carried it.
TAG_DELETE_RULES.links.push({ of: records('helpdeskTicketTagRel', 'helpdeskTicketTagRels'), field: 'tagId' });
