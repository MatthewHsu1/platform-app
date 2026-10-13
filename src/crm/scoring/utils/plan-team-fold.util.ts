import { type FrequencyWrites } from 'src/crm/scoring/types/frequency-writes.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { floatRound } from 'src/shared/utils/float-round.util';

type NoTeamRow = { id: string | null; variable: string; value: string; wonCount: number; lostCount: number };

const atLeastSeed = (count: number) => (count > 0.1 ? count : 0.1);

// A deleted team's counts are not lost: they join the rows of leads without a
// team. Both sides are rounded to whole leads before the sum, which drops the
// 0.1 seed each side started from. A row made for one team is matched by the
// next team's rows.
export const planTeamFold = ({
  teamRows,
  noTeamRows,
}: {
  teamRows: ScoringRow[];
  noTeamRows: ScoringRow[];
}): FrequencyWrites & { destroyIds: string[] } => {
  // Oldest first, so the newest row of a key is the one matched.
  const pool: NoTeamRow[] = [...noTeamRows]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((row) => ({ ...row }));
  const touched = new Set<NoTeamRow>();

  for (const teamRow of teamRows) {
    if (teamRow.wonCount <= 0.1 && teamRow.lostCount <= 0.1) {
      continue;
    }
    const match = [...pool].reverse().find((row) => row.variable === teamRow.variable && row.value === teamRow.value);

    if (match !== undefined) {
      match.wonCount = atLeastSeed(floatRound(match.wonCount, 1) + floatRound(teamRow.wonCount, 1));
      match.lostCount = atLeastSeed(floatRound(match.lostCount, 1) + floatRound(teamRow.lostCount, 1));
      touched.add(match);
    } else {
      const created: NoTeamRow = {
        id: null,
        variable: teamRow.variable,
        value: teamRow.value,
        wonCount: atLeastSeed(teamRow.wonCount),
        lostCount: atLeastSeed(teamRow.lostCount),
      };

      pool.push(created);
      touched.add(created);
    }
  }
  const updates: FrequencyWrites['updates'] = [];
  const creates: FrequencyWrites['creates'] = [];

  for (const row of touched) {
    if (row.id === null) {
      creates.push({ teamId: null, variable: row.variable, value: row.value, wonCount: row.wonCount, lostCount: row.lostCount });
    } else {
      updates.push({ id: row.id, wonCount: row.wonCount, lostCount: row.lostCount });
    }
  }

  return { updates, creates, destroyIds: teamRows.map((row) => row.id) };
};
