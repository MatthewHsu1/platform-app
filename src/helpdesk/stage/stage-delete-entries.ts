import { STAGE_DELETE_RULES } from 'src/helpdesk/delete-rules/stage-delete-rules';
import { records } from 'src/shared/triggers/records';

// A stage that may go loses its team links.
STAGE_DELETE_RULES.links.push({ of: records('helpdeskTicketStageTeam', 'helpdeskTicketStageTeams'), field: 'stageId' });
