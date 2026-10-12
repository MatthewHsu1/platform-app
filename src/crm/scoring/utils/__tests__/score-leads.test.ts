import { describe, expect, it } from 'vitest';

import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { lead, row, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { scoreLeads, scoringFactors } from 'src/crm/scoring/utils/score-leads.util';

// The rows of the worked example: one team, five closed leads (two won in New,
// two lost in New, one lost in Proposition), every email correct.
const TOOLTIP_ROWS = [
  row('team', 'stage', 'new', 2.1, 3.1),
  row('team', 'stage', 'qualified', 2.1, 1.1),
  row('team', 'stage', 'proposition', 2.1, 1.1),
  row('team', 'stage', 'won', 2.1, 0.1),
  row('team', 'country', 'c0', 1.1, 1.1),
  row('team', 'country', 'c1', 1.1, 0.1),
  row('team', 'state', 's0', 2.1, 0.1),
  row('team', 'state', 's1', 0.1, 1.1),
  row('team', 'emailState', 'CORRECT', 2.1, 3.1),
  row('team', 'phoneState', 'CORRECT', 2.1, 1.1),
  row('team', 'phoneState', 'INCORRECT', 0.1, 2.1),
  row('team', 'source', 'src1', 1.1, 0.1),
  row('team', 'source', 'src0', 0.1, 2.1),
];
const TOOLTIP_FIELDS: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source'];
const TOOLTIP_LEAD = lead({
  id: 'x',
  teamId: 'team',
  stageId: 'qualified',
  country: 'c0',
  state: 's0',
  sourceId: 'src0',
  phoneState: 'CORRECT',
  emailState: 'CORRECT',
});

describe('scoreLeads', () => {
  it('scores the worked example at 74.30', () => {
    expect(scoreLeads([TOOLTIP_LEAD], TOOLTIP_ROWS, STAGES, TOOLTIP_FIELDS).get('x')).toBe(74.3);
  });

  it('gives 0 without a stage and 100 in a won stage', () => {
    const result = scoreLeads(
      [lead({ id: 'none', teamId: 'team' }), lead({ id: 'in-won', teamId: 'team', stageId: 'won' })],
      TOOLTIP_ROWS,
      STAGES,
      TOOLTIP_FIELDS,
    );

    expect(result.get('none')).toBe(0);
    expect(result.get('in-won')).toBe(100);
  });

  it('uses the summed rows of every team for a lead whose team has no rows', () => {
    const rows = [
      row('a', 'stage', 'new', 3.1, 1.1),
      row('b', 'stage', 'new', 1.1, 3.1),
      row('a', 'source', 'src0', 2.1, 0.1),
      row(null, 'source', 'src0', 1.1, 1.1),
    ];
    // Every row summed: stage new 4.2 / 4.2; source src0 3.2 / 1.2.
    // Prior 0.5 / 0.5; stage factor 1 / 1; source 3.2/3.2 and 1.2/1.2, so 0.5.
    expect(scoreLeads([lead({ id: 'l', teamId: 'other', stageId: 'qualified', sourceId: 'src0' })], rows, STAGES, ['source']).get('l')).toBe(50);
    // Team a: stage new 3.1 / 1.1; source 2.1/2.1 and 0.1/0.1, so the prior alone: 3.1 / 4.2.
    expect(scoreLeads([lead({ id: 'l', teamId: 'a', stageId: 'qualified', sourceId: 'src0' })], rows, STAGES, ['source']).get('l')).toBe(73.81);
  });

  it('gives no result when every stage belongs to a team', () => {
    const teamStages = STAGES.map((stage) => ({ ...stage, teamIds: ['team'] }));

    expect(scoreLeads([lead({ id: 'l', teamId: 'team', stageId: 'new' })], TOOLTIP_ROWS, teamStages, TOOLTIP_FIELDS).get('l')).toBeNull();
  });

  it('keeps a pending lead strictly between 0 and 100', () => {
    const country = row('team', 'country', 'c', 1.1, 1.1);
    const sure = [row('team', 'stage', 'new', 10_000_000, 1), row('team', 'stage', 'won', 1.1, 0.1), country, row('team', 'tag', 'T', 10_000_000, 1)];
    const hopeless = [row('team', 'stage', 'new', 1, 10_000_000), row('team', 'stage', 'won', 1.1, 0.1), country, row('team', 'tag', 'T', 1, 10_000_000)];
    const pending = lead({ id: 'p', teamId: 'team', stageId: 'new', country: 'c', tags: ['T'] });

    expect(scoreLeads([pending], sure, STAGES, ['country']).get('p')).toBe(99.99);
    expect(scoreLeads([pending], hopeless, STAGES, ['country']).get('p')).toBe(0.01);
  });

  it("reads a value of a team's rows from its newest row when two rows share it, and sums both into the totals", () => {
    const rows = [
      row('team', 'stage', 'new', 2.1, 2.1),
      row('team', 'source', 'src0', 1.1, 0.1),
      row('team', 'source', 'src0', 0.1, 1.1),
      row('team', 'source', 'src1', 1.1, 1.1),
    ];

    // Prior 0.5 / 0.5, stage 1 / 1; source totals 2.3 / 2.3 and the newest
    // src0 row 0.1 / 1.1, so 0.1 / 1.2.
    expect(scoreLeads([lead({ id: 'l', teamId: 'team', stageId: 'new', sourceId: 'src0' })], rows, STAGES, ['source']).get('l')).toBe(8.33);
  });

  it('ignores a tag seen fewer than fifty times', () => {
    const rows = [row(null, 'stage', 'new', 2.1, 2.1), row(null, 'tag', 'rare', 40, 0.1), row(null, 'tag', 'other', 1.1, 3.1)];

    expect(scoreLeads([lead({ id: 'l', stageId: 'new', tags: ['rare'] })], rows, STAGES, ['tags']).get('l')).toBe(50);
  });
});

describe('scoringFactors', () => {
  it('scores each value of the worked example', () => {
    const factors = scoringFactors(TOOLTIP_LEAD, TOOLTIP_ROWS, STAGES, TOOLTIP_FIELDS);
    const byVariable = Object.fromEntries(factors.map((factor) => [factor.variable, Math.round(factor.score * 1000) / 1000]));

    expect(byVariable).toEqual({
      stage: 0.645,
      country: 0.353,
      state: 0.92,
      emailState: 0.5,
      phoneState: 0.735,
      source: 0.08,
    });
  });

  it('uses only the rows of the lead team when that team has rows', () => {
    const rows = [...TOOLTIP_ROWS, row(null, 'source', 'src0', 50, 0.1), row('other', 'stage', 'new', 9, 9)];
    const factors = scoringFactors(TOOLTIP_LEAD, rows, STAGES, TOOLTIP_FIELDS);

    expect(Math.round((factors.find((factor) => factor.variable === 'source')?.score ?? 0) * 100) / 100).toBe(0.08);
  });
});
