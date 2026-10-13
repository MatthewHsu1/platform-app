import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { teamCapacity } from 'src/sales-team/team/utils/team-capacity.util';

export const planCapacityWrites = ({
  teams,
  memberships,
}: {
  teams: { id: string; assignmentMax: number | null }[];
  memberships: MembershipRow[];
}) =>
  teams.flatMap((team) => {
    const assignmentMax = teamCapacity(team.id, memberships);

    return assignmentMax === (team.assignmentMax ?? 0) ? [] : [{ id: team.id, assignmentMax }];
  });
