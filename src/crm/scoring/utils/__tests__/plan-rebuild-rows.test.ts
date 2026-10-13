import { describe, expect, it } from 'vitest';

import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { lead, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { planRebuildRows } from 'src/crm/scoring/utils/plan-rebuild-rows.util';
import { planRebuildWrites } from 'src/crm/scoring/utils/plan-rebuild-writes.util';
import { scoreLeads } from 'src/crm/scoring/utils/score-leads.util';

const FIELDS: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source', 'tags'];

const asRows = (creates: ReturnType<typeof planRebuildRows>): ScoringRow[] =>
  creates.map((created, index) => ({ ...created, id: `r${index}`, createdAt: '2026-03-01T00:00:00.000Z' }));

// The fourteen leads of the example: team, country, state, source, stage.
const SPEC: [string | null, string, string, string, string][] = [
  ['T1', 'c0', 's0', 'src0', 'new'],
  ['T1', 'c1', 's1', 'src1', 'qualified'],
  ['T1', 'c2', 's2', 'src2', 'proposition'],
  ['T1', 'c0', 's1', 'src2', 'qualified'],
  ['T1', 'c1', 's1', 'src1', 'new'],
  ['T2', 'c0', 's1', 'src1', 'proposition'],
  ['T2', 'c0', 's1', 'src2', 'qualified'],
  ['T2', 'c0', 's2', 'src2', 'new'],
  ['T2', 'c0', 's1', 'src2', 'qualified'],
  ['T2', 'c1', 's0', 'src1', 'qualified'],
  ['T3', 'c1', 's1', 'src1', 'proposition'],
  ['T3', 'c0', 's1', 'src0', 'new'],
  ['T3', 'c1', 's2', 'src2', 'new'],
  ['T3', 'c0', 's1', 'src2', 'qualified'],
];
const LOST = [0, 1, 5, 6, 11, 12];
const WON = [2, 7, 10];

const exampleLeads = (teamless = false): LeadRow[] =>
  SPEC.map(([teamId, country, state, sourceId, stageId], index) =>
    lead({
      id: String(index),
      teamId: teamless && teamId === 'T3' ? null : teamId,
      country,
      state,
      sourceId,
      stageId: WON.includes(index) ? 'won' : stageId,
      wonStatus: WON.includes(index) ? 'WON' : LOST.includes(index) ? 'LOST' : 'PENDING',
      probability: WON.includes(index) ? 100 : LOST.includes(index) ? 0 : 10,
    }),
  );

const closed = (leads: LeadRow[]) => leads.filter((one) => one.wonStatus !== 'PENDING');

describe('rebuilding the counts from closed leads', () => {
  it('gives the example leads their scores per team', () => {
    const leads = exampleLeads();
    const rows = asRows(planRebuildRows(closed(leads), STAGES, FIELDS));
    const scores = scoreLeads(leads, rows, STAGES, FIELDS);

    expect(scores.get('3')).toBe(33.49);
    expect(scores.get('8')).toBe(7.74);
    expect(scores.get('13')).toBe(35.09);
  });

  it('scores a lead without a team on the rows of every team', () => {
    const leads = exampleLeads(true);
    const rows = asRows(planRebuildRows(closed(leads), STAGES, FIELDS));

    expect(scoreLeads(leads, rows, STAGES, FIELDS).get('13')).toBe(35.19);
  });

  it('counts each closed lead once per value, plus the 0.1 seed', () => {
    const rows = planRebuildRows(closed(exampleLeads(true)), STAGES, FIELDS);
    const find = (teamId: string | null, variable: string, value: string) =>
      rows.find((created) => created.teamId === teamId && created.variable === variable && created.value === value);

    expect(find('T1', 'stage', 'new')).toMatchObject({ wonCount: 1.1, lostCount: 2.1 });
    expect(find('T1', 'stage', 'won')).toMatchObject({ wonCount: 1.1, lostCount: 0.1 });
    expect(find('T1', 'country', 'c1')).toMatchObject({ wonCount: 0.1, lostCount: 1.1 });
    expect(find('T1', 'emailState', 'False')).toMatchObject({ wonCount: 1.1, lostCount: 2.1 });
    expect(find('T2', 'country', 'c1')).toBeUndefined();
  });

  it('weighs tags only when they were seen often enough', () => {
    const leads = exampleLeads(true);
    const tagged: LeadRow[] = Array.from({ length: 150 }, (_, index) => {
      const tags = index < 50 ? ['tag1'] : index < 100 ? ['tag2'] : ['tag1', 'tag2'];
      const isLost = index < 30 || (index >= 50 && index < 90) || (index >= 100 && index < 135);
      const isWon = (index > 30 && index < 50) || (index > 90 && index < 100) || index > 135;

      return lead({
        id: `t${index}`,
        teamId: 'blup',
        tags,
        stageId: isWon ? 'won' : 'new',
        wonStatus: isWon ? 'WON' : isLost ? 'LOST' : 'PENDING',
        probability: isWon ? 100 : isLost ? 0 : 10,
      });
    });
    const all = [...leads, ...tagged];
    const rows = asRows(planRebuildRows(closed(all), STAGES, FIELDS));
    const tagRow = (value: string) => rows.find((one) => one.variable === 'tag' && one.value === value);

    expect(tagRow('tag1')).toMatchObject({ wonCount: 33.1, lostCount: 65.1 });
    expect(tagRow('tag2')).toMatchObject({ wonCount: 23.1, lostCount: 75.1 });

    const scores = scoreLeads(all, rows, STAGES, FIELDS);

    expect(scores.get('t30')).toBe(33.69);
    expect(scores.get('t90')).toBe(23.51);
    expect(scores.get('t135')).toBe(28.05);

    const withoutTag = scoreLeads([{ ...tagged[30], tags: [] }], rows, STAGES, FIELDS);

    expect(withoutTag.get('t30')).toBe(28.6);

    const noTagField: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source'];
    const rowsNoTags = asRows(planRebuildRows(closed(all), STAGES, noTagField));
    const scoresNoTags = scoreLeads(all, rowsNoTags, STAGES, noTagField);

    expect([scoresNoTags.get('t30'), scoresNoTags.get('t90'), scoresNoTags.get('t135')]).toEqual([28.6, 28.6, 28.6]);
  });

  it('uses only the stage when no field is chosen', () => {
    const leads = exampleLeads(true).map((one) => (['3', '8'].includes(one.id) ? { ...one, stageId: 'new' } : one));
    const withNine: LeadRow[] = leads.map((one) => (one.id === '9' ? { ...one, stageId: 'won', wonStatus: 'WON', probability: 100 } : one));
    const rows = asRows(planRebuildRows(closed(withNine), STAGES, []));
    const scores = scoreLeads(withNine, rows, STAGES, []);

    expect(scores.get('3')).toBe(34.38);
    expect(scores.get('8')).toBe(50);
  });
});

describe('planRebuildWrites', () => {
  it('writes the new value, and the probability only where it followed', () => {
    const pending = [
      lead({ id: 'follows', probability: 20, automatedProbability: 20 }),
      lead({ id: 'empty', probability: null, automatedProbability: 0 }),
      lead({ id: 'typed', probability: 40, automatedProbability: 20 }),
      lead({ id: 'same', probability: 30, automatedProbability: 30 }),
      lead({ id: 'none', probability: 41.23, automatedProbability: 0 }),
    ];
    const scores = new Map<string, number | null>([
      ['follows', 25],
      ['empty', 25],
      ['typed', 25],
      ['same', 30],
      ['none', null],
    ]);

    expect(planRebuildWrites(pending, scores)).toEqual([
      { ids: ['follows', 'empty'], data: { automatedProbability: 25, probability: 25 } },
      { ids: ['typed'], data: { automatedProbability: 25 } },
    ]);
  });
});
