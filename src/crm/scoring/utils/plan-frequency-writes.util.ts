import { type FrequencyWrites } from 'src/crm/scoring/types/frequency-writes.type';
import { type ScoringDelta } from 'src/crm/scoring/types/scoring-delta.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { floatRound } from 'src/shared/utils/float-round.util';

type Pending = { id: string | null; teamId: string | null; variable: string; value: string; wonCount: number; lostCount: number };

const keyOf = (teamId: string | null, variable: string, value: string) => JSON.stringify([teamId, variable, value]);

// A count never reaches zero: a value seen on no lost lead would otherwise
// make every score that uses it zero.
const atLeastSeed = (count: number) => (count > 0 ? count : 0.1);

// The row writes for the deltas, applied in order. A row made by an earlier
// delta counts as existing for a later one; a decrease of a row that does not
// exist is dropped.
export const planFrequencyWrites = (existing: ScoringRow[], deltas: ScoringDelta[]): FrequencyWrites => {
  const rows = new Map<string, Pending>();

  // The newest row wins when two rows share a key.
  for (const row of [...existing].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))) {
    rows.set(keyOf(row.teamId, row.variable, row.value), { ...row });
  }
  const touched = new Set<string>();

  for (const delta of deltas) {
    const key = keyOf(delta.teamId, delta.variable, delta.value);
    const current = rows.get(key);

    if (current !== undefined) {
      current.wonCount = atLeastSeed(current.wonCount + delta.won);
      current.lostCount = atLeastSeed(current.lostCount + delta.lost);
      touched.add(key);
    } else if (delta.won > 0 || delta.lost > 0) {
      rows.set(key, {
        id: null,
        teamId: delta.teamId,
        variable: delta.variable,
        value: delta.value,
        wonCount: delta.won + 0.1,
        lostCount: delta.lost + 0.1,
      });
      touched.add(key);
    }
  }
  const writes: FrequencyWrites = { updates: [], creates: [] };

  for (const key of touched) {
    const row = rows.get(key);

    if (row === undefined) {
      continue;
    }
    const wonCount = floatRound(row.wonCount, 0.1);
    const lostCount = floatRound(row.lostCount, 0.1);

    if (row.id === null) {
      writes.creates.push({ teamId: row.teamId, variable: row.variable, value: row.value, wonCount, lostCount });
    } else {
      writes.updates.push({ id: row.id, wonCount, lostCount });
    }
  }

  return writes;
};
