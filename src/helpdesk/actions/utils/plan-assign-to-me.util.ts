import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import { type CaseActionPlan } from 'src/helpdesk/actions/types/case-action-plan.type';
import { type CaseMembershipRow } from 'src/helpdesk/types/case-membership-row.type';
import { isTeamMember } from 'src/helpdesk/utils/team-membership.util';

// A member of the case team, or anyone when the case has no team, may take the case.
export const planAssignToMe = ({
  teamId,
  assignedUserId,
  memberId,
  memberships,
}: {
  teamId: string | null;
  assignedUserId: string | null;
  memberId: string;
  memberships: CaseMembershipRow[];
}): CaseActionPlan => {
  if (assignedUserId === memberId) {
    return { kind: 'refuse', reason: HELPDESK_ACTION_MESSAGES.alreadyYours };
  }
  if (teamId !== null && !isTeamMember(teamId, memberId, memberships)) {
    return { kind: 'refuse', reason: HELPDESK_ACTION_MESSAGES.notInTeam };
  }

  return { kind: 'write', data: { assignedUserId: memberId } };
};
