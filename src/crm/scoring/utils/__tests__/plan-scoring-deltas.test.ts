import { describe, expect, it } from 'vitest';

import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { lead, row, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { planFrequencyWrites } from 'src/crm/scoring/utils/plan-frequency-writes.util';
import { planScoringDeltas } from 'src/crm/scoring/utils/plan-scoring-deltas.util';

const FIELDS: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source', 'tags'];
const START = '2000-01-01';

// The rows the full rebuild makes for teams T1 and T2 of the fourteen-lead
// example (only the ones the moves below touch).
const rebuiltRows = () => [
  row('T1', 'stage', 'new', 1.1, 2.1),
  row('T1', 'stage', 'qualified', 1.1, 1.1),
  row('T1', 'stage', 'proposition', 1.1, 0.1),
  row('T1', 'stage', 'won', 1.1, 0.1),
  row('T1', 'country', 'c1', 0.1, 1.1),
  row('T1', 'state', 's1', 0.1, 1.1),
  row('T1', 'source', 'src1', 0.1, 1.1),
  row('T1', 'emailState', 'False', 1.1, 2.1),
  row('T1', 'phoneState', 'False', 1.1, 2.1),
  row('T2', 'stage', 'new', 1.1, 2.1),
  row('T2', 'stage', 'qualified', 1.1, 2.1),
  row('T2', 'stage', 'proposition', 1.1, 1.1),
  row('T2', 'stage', 'won', 1.1, 0.1),
  row('T2', 'source', 'src1', 0.1, 1.1),
  row('T2', 'emailState', 'False', 1.1, 2.1),
  row('T2', 'phoneState', 'False', 1.1, 2.1),
];

const LEAD_4 = lead({ id: 'lead-4', teamId: 'T1', stageId: 'new', country: 'c1', state: 's1', sourceId: 'src1' });
const LEAD_9_WON = lead({ id: 'lead-9', teamId: 'T2', stageId: 'won', country: 'c1', state: 's0', sourceId: 'src1' });

// Applies the planned writes to the rows, as the database would after them.
const apply = (rows: ScoringRow[], moves: Parameters<typeof planScoringDeltas>[0]['moves']) => {
  const writes = planFrequencyWrites(rows, planScoringDeltas({ moves, stages: STAGES, fields: FIELDS, startDate: START }));
  const updated = rows.map((existing) => {
    const update = writes.updates.find((candidate) => candidate.id === existing.id);

    return update === undefined ? existing : { ...existing, wonCount: update.wonCount, lostCount: update.lostCount };
  });

  return [...updated, ...writes.creates.map((created, index) => ({ ...created, id: `new-${index}`, createdAt: '2026-03-01T00:00:00.000Z' }))];
};

const counts = (rows: ScoringRow[], teamId: string | null, variable: string, value: string) => {
  const found = rows.find((candidate) => candidate.teamId === teamId && candidate.variable === variable && candidate.value === value);

  return found === undefined ? null : [found.wonCount, found.lostCount];
};

describe('live won and lost counts', () => {
  it('adds a lost lead to its stage and earlier ones, and a won lead to every stage', () => {
    const rows = apply(rebuiltRows(), [
      { lead: LEAD_4, moves: { won: 0, lost: 1 } },
      { lead: LEAD_9_WON, moves: { won: 1, lost: 0 } },
    ]);

    expect(counts(rows, 'T1', 'stage', 'new')).toEqual([1.1, 3.1]);
    expect(counts(rows, 'T1', 'stage', 'won')).toEqual([1.1, 0.1]);
    expect(counts(rows, 'T1', 'country', 'c1')).toEqual([0.1, 2.1]);
    expect(counts(rows, 'T1', 'emailState', 'False')).toEqual([1.1, 3.1]);
    expect(counts(rows, 'T2', 'stage', 'new')).toEqual([2.1, 2.1]);
    expect(counts(rows, 'T2', 'stage', 'won')).toEqual([2.1, 0.1]);
    expect(counts(rows, 'T2', 'country', 'c1')).toEqual([1.1, 0.1]);
    expect(counts(rows, 'T2', 'emailState', 'False')).toEqual([2.1, 2.1]);
  });

  it('takes a restored lead back out of the lost counts', () => {
    const lost = apply(rebuiltRows(), [{ lead: LEAD_4, moves: { won: 0, lost: 1 } }]);
    const restored = apply(lost, [{ lead: LEAD_4, moves: { won: 0, lost: -1 } }]);

    expect(counts(restored, 'T1', 'stage', 'new')).toEqual([1.1, 2.1]);
    expect(counts(restored, 'T1', 'country', 'c1')).toEqual([0.1, 1.1]);
    expect(counts(restored, 'T1', 'emailState', 'False')).toEqual([1.1, 2.1]);
  });

  it('adds a lead moved into a won stage and removes it again when it leaves', () => {
    const won = apply(rebuiltRows(), [{ lead: { ...LEAD_4, stageId: 'won' }, moves: { won: 1, lost: 0 } }]);

    expect(counts(won, 'T1', 'stage', 'new')).toEqual([2.1, 2.1]);
    expect(counts(won, 'T1', 'stage', 'won')).toEqual([2.1, 0.1]);
    expect(counts(won, 'T1', 'country', 'c1')).toEqual([1.1, 1.1]);

    const back = apply(won, [{ lead: LEAD_4, moves: { won: -1, lost: 0 } }]);

    expect(counts(back, 'T1', 'stage', 'new')).toEqual([1.1, 2.1]);
    expect(counts(back, 'T1', 'stage', 'won')).toEqual([1.1, 0.1]);
    expect(counts(back, 'T1', 'country', 'c1')).toEqual([0.1, 1.1]);
  });

  it('never stores a count at zero or below', () => {
    const rows = apply([row(null, 'stage', 'new', 0.6, 0.1)], [{ lead: lead({ id: 'l', stageId: 'new' }), moves: { won: -1, lost: 0 } }]);

    expect(counts(rows, null, 'stage', 'new')).toEqual([0.1, 0.1]);
  });

  it('does not create a row for a decrease', () => {
    const writes = planFrequencyWrites(
      [],
      planScoringDeltas({ moves: [{ lead: lead({ id: 'l', stageId: 'new' }), moves: { won: 0, lost: -1 } }], stages: STAGES, fields: [], startDate: START }),
    );

    expect(writes).toEqual({ updates: [], creates: [] });
  });

  it('applies a lost-to-won save as a win followed by leaving lost', () => {
    const rows = apply([], [{ lead: lead({ id: 'l', stageId: 'won' }), moves: { won: 1, lost: -1 } }]);

    expect(counts(rows, null, 'stage', 'won')).toEqual([1.1, 0.1]);
    expect(counts(rows, null, 'stage', 'new')).toEqual([1.1, 0.1]);
  });

  it('counts only leads created on or after the start date, and nothing without one', () => {
    const old = lead({ id: 'old', stageId: 'new', createdAt: '1999-12-31T23:00:00.000Z' });

    expect(planScoringDeltas({ moves: [{ lead: old, moves: { won: 0, lost: 1 } }], stages: STAGES, fields: [], startDate: START })).toEqual([]);
    expect(planScoringDeltas({ moves: [{ lead: LEAD_4, moves: { won: 0, lost: 1 } }], stages: STAGES, fields: [], startDate: null })).toEqual([]);
    expect(planScoringDeltas({ moves: [{ lead: LEAD_4, moves: { won: 0, lost: 1 } }], stages: STAGES, fields: [], startDate: '2026-13-01' })).toEqual([]);
  });

  it('sums the leads of one batch before writing a row', () => {
    const tagged = (id: string) => lead({ id, teamId: 'blup', stageId: 'new', tags: ['tag1'] });
    const writes = planFrequencyWrites(
      [],
      planScoringDeltas({
        moves: [tagged('a'), tagged('b'), tagged('c')].map((one) => ({ lead: one, moves: { won: 0, lost: 1 } as const })),
        stages: STAGES,
        fields: ['tags'],
        startDate: START,
      }),
    );

    expect(writes.creates.find((created) => created.variable === 'tag')).toEqual({
      teamId: 'blup',
      variable: 'tag',
      value: 'tag1',
      wonCount: 0.1,
      lostCount: 3.1,
    });
  });
});
