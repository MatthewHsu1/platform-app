import { defineLogicFunction } from 'twenty-sdk/define';

import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { caseRouteHandler, currentMemberId, findCaseAsUser, readCaseId, updateCaseAsUser } from 'src/helpdesk/actions/case-action-route';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import {
  ASSIGN_TO_ME_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  ASSIGN_TO_ME_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { planAssignToMe } from 'src/helpdesk/actions/utils/plan-assign-to-me.util';
import { records } from 'src/shared/triggers/records';

const members = records('helpdeskTicketTeamMember', 'helpdeskTicketTeamMembers');

// Reads the case as the clicking user and writes with their token, so the case trigger applies the save rules
// (assignment date, team, stage) as for an edit on the page. The team's members are read with the app token:
// a user may be refused for a team they cannot read.
const handler = caseRouteHandler(async (body) => {
  const caseId = readCaseId(body);

  if (caseId === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.selectOneCase, {}, 400);
  }
  const row = await findCaseAsUser(caseId);

  if (row === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.caseNotFound, {}, 404);
  }
  const memberId = await currentMemberId();

  if (memberId === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.notInTeam);
  }
  const memberships =
    row.teamId === null ? [] : await members.find<{ teamId: string; workspaceMemberId: string }>({ teamId: { eq: row.teamId } }, 'teamId workspaceMemberId');
  const plan = planAssignToMe({ teamId: row.teamId, assignedUserId: row.assignedUserId, memberId, memberships });

  if (plan.kind === 'refuse') {
    throw new CaseActionError(plan.reason);
  }
  await updateCaseAsUser(caseId, plan.data);

  return { caseId };
});

export default defineLogicFunction({
  universalIdentifier: ASSIGN_TO_ME_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'assign-work-case-to-me',
  description: 'Gives a work case to the clicking user, if they belong to its team or it has none.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: ASSIGN_TO_ME_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
