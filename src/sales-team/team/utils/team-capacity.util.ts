import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';

// Paused members still count: pausing stops their assignment, not the team's
// capacity.
export const teamCapacity = (teamId: string, memberships: MembershipRow[]) =>
  memberships
    .filter((membership) => membership.active && membership.teamId === teamId)
    .reduce((total, membership) => total + (membership.assignmentMax ?? 0), 0);
