import { describe, expect, it } from 'vitest';

import { matchesTwentyFilter } from 'src/crm/assignment/__tests__/fakes/matches-twenty-filter';
import { makeReadLeadScoring } from 'src/crm/scoring/read-lead-scoring';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { type ScoringTotal } from 'src/crm/scoring/types/scoring-total.type';
import { lead, row, STAGES, TOOLTIP_FIELDS, TOOLTIP_LEAD, TOOLTIP_ROWS } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { scoreLeads } from 'src/crm/scoring/utils/score-leads.util';

// The scoring table as Twenty serves it: a filtered list and a sum per variable and team.
const fakeTable = (table: ScoringRow[], { groupLimit = Infinity }: { groupLimit?: number } = {}) => {
  const calls = { findRows: 0, sumRows: 0, rowsRead: 0 };
  const api = {
    findRows: async (filter: Record<string, unknown>) => {
      calls.findRows += 1;
      const found = table.filter((entry) => matchesTwentyFilter(filter, entry as unknown as Record<string, unknown>));

      calls.rowsRead += found.length;
      return found;
    },
    sumRows: async (variables: string[]) => {
      calls.sumRows += 1;
      const sums = new Map<string, ScoringTotal>();

      for (const entry of table.filter((candidate) => variables.includes(candidate.variable))) {
        const key = `${entry.variable}|${entry.teamId}`;
        const sum = sums.get(key) ?? { variable: entry.variable, teamId: entry.teamId, wonCount: 0, lostCount: 0 };

        sum.wonCount += entry.wonCount;
        sum.lostCount += entry.lostCount;
        sums.set(key, sum);
      }
      // A server answer cut at its group limit is reported as cut.
      return sums.size >= groupLimit ? null : [...sums.values()];
    },
  };

  return { api, calls };
};

const FIELDS: PlsFieldKey[] = ['country', 'state', 'emailState', 'phoneState', 'source'];

describe('reading the scoring counts of a batch of leads', () => {
  it('scores the worked example at 74.30 from the rows of its own values and the totals', async () => {
    const { api } = fakeTable(TOOLTIP_ROWS);

    const counts = await makeReadLeadScoring(api)([TOOLTIP_LEAD], TOOLTIP_FIELDS);

    expect(scoreLeads([TOOLTIP_LEAD], counts.rows, STAGES, TOOLTIP_FIELDS, counts.totals).get('x')).toBe(74.3);
  });

  it('reads once for a batch of 200 leads among 3,200 rows, only the values the leads have, and scores as with every row', async () => {
    // 1,600 closed leads, each with its own country and state, in three teams and none.
    const teams = ['a', 'b', 'c', null];
    const table = [
      ...teams.flatMap((team) => STAGES.map((stage) => row(team, 'stage', stage.id, 40.1, 60.1))),
      ...Array.from({ length: 1600 }, (_, index) => [
        row(teams[index % 4], 'country', `c${index}`, index % 3 === 0 ? 1.1 : 0.1, index % 3 === 0 ? 0.1 : 1.1),
        row(teams[index % 4], 'state', `s${index}`, index % 5 === 0 ? 1.1 : 0.1, index % 5 === 0 ? 0.1 : 1.1),
      ]).flat(),
    ];
    const batch = Array.from({ length: 200 }, (_, index) =>
      lead({ id: `l${index}`, teamId: teams[index % 4], stageId: 'new', country: `c${index * 7}`, state: `s${index * 3}` }),
    );
    const { api, calls } = fakeTable(table);

    const counts = await makeReadLeadScoring(api)(batch, FIELDS);

    expect({ findRows: calls.findRows, sumRows: calls.sumRows }).toEqual({ findRows: 1, sumRows: 1 });
    // The stage rows (4 stages in 4 buckets) and at most two rows a lead.
    expect(calls.rowsRead).toBeLessThanOrEqual(16 + 2 * 200);
    const full = scoreLeads(batch, table, STAGES, FIELDS);

    for (const scored of batch) {
      expect(scoreLeads([scored], counts.rows, STAGES, FIELDS, counts.totals).get(scored.id)).toBe(full.get(scored.id));
    }
  });

  it('reads nothing for a batch with no lead', async () => {
    const { api, calls } = fakeTable(TOOLTIP_ROWS);

    expect(await makeReadLeadScoring(api)([], FIELDS)).toEqual({ rows: [], totals: [] });
    expect(calls).toEqual({ findRows: 0, sumRows: 0, rowsRead: 0 });
  });

  it('scores as with every row when tags, two rows of one value in a team and leads without a team are in play', async () => {
    const tagFields: PlsFieldKey[] = ['country', 'source', 'tags'];
    const table = [
      ...['a', 'b', null].flatMap((team) => STAGES.map((stage) => row(team, 'stage', stage.id, 20.1, 30.1))),
      row('a', 'country', 'c0', 3.1, 1.1),
      row('a', 'country', 'c0', 1.1, 4.1),
      row('a', 'country', 'c1', 2.1, 2.1),
      row('b', 'country', 'c0', 0.1, 2.1),
      row(null, 'country', 'c0', 5.1, 0.1),
      row(null, 'country', 'c9', 0.1, 7.1),
      row('a', 'source', 's0', 1.1, 3.1),
      row(null, 'source', 's1', 4.1, 0.1),
      row('a', 'tag', 'Gym', 40.1, 30.1),
      row(null, 'tag', 'Gym', 20.1, 10.1),
      row('a', 'tag', 'Rare', 20.1, 0.1),
      row('c', 'tag', 'Rare', 1.1, 0.1),
    ];
    const batch = [
      lead({ id: 'team-a', teamId: 'a', stageId: 'qualified', country: 'c0', sourceId: 's0', tags: ['Gym', 'Rare'] }),
      lead({ id: 'team-b', teamId: 'b', stageId: 'new', country: 'c0', sourceId: 's1', tags: ['Gym'] }),
      lead({ id: 'no-team', teamId: null, stageId: 'proposition', country: 'c0', sourceId: 's1', tags: ['Gym'] }),
      lead({ id: 'rare-only', teamId: 'c', stageId: 'new', tags: ['Rare'] }),
      lead({ id: 'team-without-rows', teamId: 'z', stageId: 'new', country: 'c9' }),
    ];
    const { api } = fakeTable(table);

    const counts = await makeReadLeadScoring(api)(batch, tagFields);

    for (const scored of batch) {
      expect(scoreLeads([scored], counts.rows, STAGES, tagFields, counts.totals).get(scored.id)).toBe(
        scoreLeads([scored], table, STAGES, tagFields).get(scored.id),
      );
    }
  });

  it('reads every row of the variables when the server cuts the totals at its group limit, never scoring from cut totals', async () => {
    const table = [
      ...STAGES.map((stage) => row('a', 'stage', stage.id, 20.1, 30.1)),
      row('a', 'country', 'c0', 3.1, 1.1),
      row('b', 'country', 'c1', 1.1, 4.1),
      row(null, 'country', 'c2', 2.1, 2.1),
    ];
    const scored = lead({ id: 'l', teamId: 'a', stageId: 'new', country: 'c0' });
    const { api, calls } = fakeTable(table, { groupLimit: 2 });

    const counts = await makeReadLeadScoring(api)([scored], ['country']);

    expect(counts.totals).toEqual([]);
    expect(calls.findRows).toBe(2);
    expect(scoreLeads([scored], counts.rows, STAGES, ['country'], counts.totals).get('l')).toBe(scoreLeads([scored], table, STAGES, ['country']).get('l'));
  });
});
