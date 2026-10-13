import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { isTeamMemberOrLeader } from 'src/sales-team/team/utils/default-team.util';
import { sortTeams } from 'src/sales-team/team/utils/sort-teams.util';

// The merge dialog's team follows its salesperson: the chosen team stays when
// the salesperson leads it or belongs to it, else their first team, else none.
export const planMergeTeam = ({
  salespersonId,
  teamId,
  teams,
  memberships,
}: {
  salespersonId: string | null;
  teamId: string | null;
  teams: TeamRow[];
  memberships: MembershipRow[];
}) => {
  if (salespersonId === null) {
    return teamId;
  }

  const activeTeams = sortTeams(teams.filter((team) => team.active));
  const chosen = activeTeams.find((team) => team.id === teamId);

  if (chosen !== undefined && isTeamMemberOrLeader(chosen, salespersonId, memberships)) {
    return chosen.id;
  }

  return activeTeams.find((team) => isTeamMemberOrLeader(team, salespersonId, memberships))?.id ?? null;
};
