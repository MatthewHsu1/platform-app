import { describe, expect, it } from 'vitest';

import { applicableStages } from 'src/helpdesk/utils/applicable-stages.util';
import { DEFAULT_STAGES, stage } from 'src/helpdesk/utils/__tests__/case-fixtures';

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe('applicableStages', () => {
  it('gives a team its own stages and the stages of every team, lowest sequence first', () => {
    const stages = DEFAULT_STAGES.map((row) =>
      row.id === 'new' ? { ...row, teamIds: ['teamA', 'teamB'] } : row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row,
    );

    expect(applicableStages(stages, 'teamA')[0].id).toBe('new');
    expect(ids(applicableStages(stages, 'teamA'))).toEqual(['new', 'awaiting', 'done', 'cancelled', 'rejected']);
  });

  it('moves a team to its first own stage when the shared first stage no longer lists it', () => {
    const stages = DEFAULT_STAGES.map((row) =>
      row.id === 'new' ? { ...row, teamIds: ['teamA'] } : row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row,
    );

    expect(applicableStages(stages, 'teamB')[0].id).toBe('inProgress');
  });

  it('gives a case without a team only the stages that name no team', () => {
    const stages = DEFAULT_STAGES.map((row) => (row.id === 'inProgress' ? { ...row, teamIds: ['teamB'] } : row));

    expect(ids(applicableStages(stages, null))).toEqual(['new', 'awaiting', 'done', 'cancelled', 'rejected']);
  });

  it('leaves archived stages out', () => {
    const stages = [stage('archived', 0, { active: false }), ...DEFAULT_STAGES];

    expect(applicableStages(stages, null)[0].id).toBe('new');
  });

  it('puts the earlier stage first when two share a sequence', () => {
    const stages = [stage('later', 1, {}, 20), stage('earlier', 1, {}, 10)];

    expect(ids(applicableStages(stages, null))).toEqual(['earlier', 'later']);
  });
});
