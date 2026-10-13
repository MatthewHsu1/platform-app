import { TEAM_DELETE_RULES } from 'src/helpdesk/delete-rules/team-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted team leaves its cases and its child teams, and loses its member, category and stage links.
TEAM_DELETE_RULES.references.push(
  { of: records('helpdeskTicket', 'helpdeskTickets'), field: 'teamId' },
  { of: records('helpdeskTicketTeam', 'helpdeskTicketTeams'), field: 'parentId' },
);
TEAM_DELETE_RULES.links.push(
  { of: records('helpdeskTicketTeamMember', 'helpdeskTicketTeamMembers'), field: 'teamId' },
  { of: records('helpdeskTicketTeamCategory', 'helpdeskTicketTeamCategories'), field: 'teamId' },
  { of: records('helpdeskTicketStageTeam', 'helpdeskTicketStageTeams'), field: 'teamId' },
);
