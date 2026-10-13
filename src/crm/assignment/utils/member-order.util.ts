// The members who can still take leads, the largest remaining quota first;
// equal quotas in random order so nobody is always served first.
export const planMemberOrder = <TMember extends { membershipId: string; assignmentOptout: boolean }>(
  members: TMember[],
  quotas: ReadonlyMap<string, number>,
  random: () => number,
): TMember[] =>
  members
    .filter((member) => !member.assignmentOptout && (quotas.get(member.membershipId) ?? 0) > 0)
    .map((member) => ({ member, quota: quotas.get(member.membershipId) ?? 0, tieBreak: random() }))
    .sort((left, right) => right.quota - left.quota || right.tieBreak - left.tieBreak)
    .map((entry) => entry.member);
