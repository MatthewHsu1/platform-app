import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';

// With one team per salesperson, a membership made or switched on archives
// the salesperson's memberships in other teams that were active before this
// save. Rows made or switched on in the same save leave each other alone.
export const planMembershipArchive = ({
  accepted,
  rows,
  membershipMulti,
}: {
  accepted: MemberCandidate[];
  rows: MemberCandidate[];
  membershipMulti: boolean;
}): string[] => {
  if (membershipMulti) {
    return [];
  }

  const acceptedIds = new Set(accepted.map((membership) => membership.id));

  return rows
    .filter(
      (other) =>
        other.active &&
        !acceptedIds.has(other.id) &&
        accepted.some((membership) => membership.active && membership.userId === other.userId && membership.teamId !== other.teamId),
    )
    .map((other) => other.id)
    .sort();
};
