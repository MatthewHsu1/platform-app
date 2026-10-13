import { LEAD_TYPE } from 'src/crm/crm-options.constant';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { sortTeams } from 'src/sales-team/team/utils/sort-teams.util';

// Only an active membership makes a member.
export const isTeamMemberOrLeader = (team: TeamRow, userId: string, memberships: MembershipRow[]) =>
  team.leaderId === userId ||
  memberships.some((membership) => membership.active && membership.teamId === team.id && membership.userId === userId);

const takesLeadType = (team: TeamRow, leadType: string | null) =>
  leadType === LEAD_TYPE.LEAD ? team.useLeads : team.useOpportunities;

// The team a salesperson's lead belongs to. Clearing the salesperson keeps
// the team; a current team they lead or belong to stays, archived or not.
// Otherwise, among active teams in team order: their first team that takes
// this kind of lead, their first team, the first team that takes it, the
// first team.
export const defaultTeam = ({
  salespersonId,
  leadType,
  currentTeamId,
  useTypeFilter,
  teams,
  memberships,
}: {
  salespersonId: string | null;
  leadType: string | null;
  currentTeamId: string | null;
  useTypeFilter: boolean;
  teams: TeamRow[];
  memberships: MembershipRow[];
}): string | null => {
  if (salespersonId === null) {
    return currentTeamId;
  }

  const current = teams.find((team) => team.id === currentTeamId);

  if (current !== undefined && isTeamMemberOrLeader(current, salespersonId, memberships)) {
    return current.id;
  }

  const activeTeams = sortTeams(teams.filter((team) => team.active));
  const passes = (team: TeamRow) => !useTypeFilter || takesLeadType(team, leadType);
  const ownTeams = activeTeams.filter((team) => isTeamMemberOrLeader(team, salespersonId, memberships));
  const chosen = ownTeams.find(passes) ?? ownTeams[0] ?? activeTeams.find(passes) ?? activeTeams[0];

  return chosen?.id ?? null;
};
