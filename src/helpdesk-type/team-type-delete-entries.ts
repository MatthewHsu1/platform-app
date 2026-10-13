import { TEAM_DELETE_RULES } from 'src/helpdesk/delete-rules/team-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted team loses its type links.
TEAM_DELETE_RULES.links.push({ of: records('helpdeskTicketTypeTeam', 'helpdeskTicketTypeTeams'), field: 'teamId' });
