import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';

const pairOf = (row: MemberCandidate) => `${row.teamId}|${row.userId}`;

// A salesperson is in a team once: an active row of a pair that has another
// active row is refused, both when two such rows are saved together. Archived
// rows of the pair may repeat.
export const planMemberRefusal = ({ candidates, rows }: { candidates: MemberCandidate[]; rows: MemberCandidate[] }): string[] => {
  const activeByPair = new Map<string, string[]>();

  for (const row of rows) {
    if (row.active && row.teamId !== null && row.userId !== null) {
      activeByPair.set(pairOf(row), [...(activeByPair.get(pairOf(row)) ?? []), row.id]);
    }
  }

  return candidates
    .filter(
      (candidate) =>
        candidate.active &&
        candidate.teamId !== null &&
        candidate.userId !== null &&
        (activeByPair.get(pairOf(candidate)) ?? []).some((id) => id !== candidate.id),
    )
    .map((candidate) => candidate.id);
};
