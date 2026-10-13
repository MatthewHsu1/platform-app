import { MEMBER_SELECTION, toMembershipRows } from 'src/sales-team/load-team-context';
import { type TeamContextLists } from 'src/sales-team/types/team-context-lists.type';
import { planCapacityWrites } from 'src/sales-team/team/utils/plan-capacity-writes.util';
import { findMany, records } from 'src/shared/triggers/records';

const teams = records('crmTeam', 'crmTeams');
const members = records('crmTeamMember', 'crmTeamMembers');

// The one writer of a team's capacity: the sum over its active members.
// Without ids every team is summed again (a removed salesperson's
// memberships are gone without saying which teams they were in).
export const recomputeTeamCapacity = async (teamIds?: string[]) => {
  const found = await findMany<{ teamRows: { id: string; assignmentMax: number | null }[]; memberRows: TeamContextLists['memberRows'] }>({
    teamRows: { of: teams, filter: teamIds === undefined ? {} : { id: { in: teamIds } }, selection: 'id assignmentMax' },
    memberRows: {
      of: members,
      filter: teamIds === undefined ? { active: { eq: true } } : { crmTeamId: { in: teamIds }, active: { eq: true } },
      selection: MEMBER_SELECTION,
    },
  });

  for (const write of planCapacityWrites({ teams: found.teamRows, memberships: toMembershipRows(found.memberRows) })) {
    await teams.update(write.id, { assignmentMax: write.assignmentMax });
  }
};
