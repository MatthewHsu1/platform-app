import { describe, expect, it } from 'vitest';

import { row } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';
import { planTeamFold } from 'src/crm/scoring/utils/plan-team-fold.util';

describe('planTeamFold', () => {
  it('moves the counts of a deleted team into the rows without a team', () => {
    const noTeamRows = [
      row(null, 'stage', '1', 20, 10),
      row(null, 'stage', '2', 0.1, 0.1),
      row(null, 'stage', '3', 10, 0),
      row(null, 'country', '1', 10, 0.1),
    ];
    const teamRows = [
      row('team', 'stage', '1', 20, 10),
      row('team', 'country', '1', 0.1, 10),
      row('team', 'country', '2', 0.1, 0),
      row('team', 'country', '3', 30, 30),
    ];
    const fold = planTeamFold({ teamRows, noTeamRows });

    expect(fold.updates).toEqual([
      { id: noTeamRows[0].id, wonCount: 40, lostCount: 20 },
      { id: noTeamRows[3].id, wonCount: 10, lostCount: 10 },
    ]);
    expect(fold.creates).toEqual([{ teamId: null, variable: 'country', value: '3', wonCount: 30, lostCount: 30 }]);
    expect(fold.destroyIds).toEqual(teamRows.map((teamRow) => teamRow.id));
  });

  it('folds into the newest row when two rows without a team share a value', () => {
    const noTeamRows = [row(null, 'country', '1', 5, 5), row(null, 'country', '1', 10, 0.1)];
    const fold = planTeamFold({ teamRows: [row('team', 'country', '1', 0.1, 10)], noTeamRows });

    expect(fold.updates).toEqual([{ id: noTeamRows[1].id, wonCount: 10, lostCount: 10 }]);
  });

  it('folds a second deleted team into a row the first one created', () => {
    const fold = planTeamFold({
      teamRows: [row('a', 'country', '3', 30, 30), row('b', 'country', '3', 5.1, 4.9)],
      noTeamRows: [],
    });

    expect(fold.creates).toEqual([{ teamId: null, variable: 'country', value: '3', wonCount: 35, lostCount: 35 }]);
    expect(fold.updates).toEqual([]);
  });
});
