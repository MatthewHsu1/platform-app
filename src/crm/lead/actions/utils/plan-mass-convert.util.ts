import { PRIORITY_RANK } from 'src/crm/crm-options.constant';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { defaultTeam } from 'src/sales-team/team/utils/default-team.util';

// The order leads are listed in: priority, highest first, then the newest.
export const planDedupeWalkOrder = (leads: LeadRow[]) =>
  [...leads].sort(
    (left, right) =>
      (PRIORITY_RANK[right.priority ?? ''] ?? 0) - (PRIORITY_RANK[left.priority ?? ''] ?? 0) ||
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );

// The leads still to convert: the selection without what the merges took
// away, then the leads the merges kept, at the end.
export const planFinalList = ({
  selectedIds,
  mergedIds,
  headIds,
}: {
  selectedIds: string[];
  mergedIds: ReadonlySet<string>;
  headIds: string[];
}) => {
  const final = selectedIds.filter((id) => !mergedIds.has(id));

  for (const headId of headIds) {
    if (!final.includes(headId)) {
      final.push(headId);
    }
  }

  return final;
};

// Clearing the salespersons keeps the team; otherwise the team follows the
// first salesperson, else the current user.
export const planMassTeam = ({
  salespersonIds,
  currentUserId,
  teamId,
  teams,
  memberships,
}: {
  salespersonIds: string[];
  currentUserId: string | null;
  teamId: string | null;
  teams: TeamRow[];
  memberships: MembershipRow[];
}) => {
  if (salespersonIds.length === 0 && teamId !== null) {
    return teamId;
  }

  const userId = salespersonIds[0] ?? currentUserId;

  return userId === null
    ? teamId
    : defaultTeam({ salespersonId: userId, leadType: null, currentTeamId: teamId, useTypeFilter: false, teams, memberships });
};
