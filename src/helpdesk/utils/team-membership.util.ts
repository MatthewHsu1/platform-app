import { type CaseMembershipRow } from 'src/helpdesk/types/case-membership-row.type';
import { type CaseTeamRow } from 'src/helpdesk/types/case-team-row.type';

export const isTeamMember = (teamId: string, workspaceMemberId: string, memberships: CaseMembershipRow[]) =>
  memberships.some((link) => link.teamId === teamId && link.workspaceMemberId === workspaceMemberId);

export const firstTeamOfMember = (workspaceMemberId: string, teams: CaseTeamRow[], memberships: CaseMembershipRow[]) => {
  const [first] = teams
    .filter((team) => team.active && isTeamMember(team.id, workspaceMemberId, memberships))
    .sort(
      (left, right) =>
        left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );

  return first?.id ?? null;
};
