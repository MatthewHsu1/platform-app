import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import { runManualAssignment } from 'src/crm/assignment/assignment-route';
import {
  ASSIGN_TEAM_LEADS_ROUTE_PATH,
  ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS,
} from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { readTeamDoorTeamIds } from 'src/crm/assignment/team-door-team-ids';
import { readBody } from 'src/shared/route-response';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

// Read as the clicking user: a team they cannot see is not found.
const findTeam = async (teamId: string) =>
  requireData(
    await twentyGraphql<{ crmTeam: { useLeads: boolean | null; useOpportunities: boolean | null } | null }>(
      'person',
      'query TeamForAssignment($id: UUID!) { crmTeam(filter: { id: { eq: $id } }) { useLeads useOpportunities } }',
      { id: teamId },
    ),
    'Read the team',
  ).crmTeam;

const handler = (payload: RoutePayload) =>
  runManualAssignment({
    door: 'TEAM_BUTTON',
    readTeamIds: (locale) => readTeamDoorTeamIds({ body: readBody(payload), locale, findTeam }),
  });

export default defineLogicFunction({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamRoute,
  name: 'crm-team-assign-leads',
  description: "Assigns the team's unassigned leads to the team and its salespeople now.",
  timeoutSeconds: 900,
  handler,
  httpRouteTriggerSettings: { path: ASSIGN_TEAM_LEADS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
