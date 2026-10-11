import { describe, expect, it } from 'vitest';

import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { planStageGroups } from 'src/crm/stage/utils/plan-stage-groups.util';

const stage = (id: string, sequence: number): StageRow => ({
  id,
  name: id,
  sequence,
  isWon: false,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  teamIds: [],
});
const STAGES = [stage('new', 1), stage('qualified', 2), stage('proposition', 3), stage('won', 70)];

describe('planStageGroups', () => {
  it('gives every stage one column in stage order and drops columns of stages that are gone', () => {
    const plan = planStageGroups({
      stages: STAGES,
      groups: [
        { id: 'g-new', fieldValue: 'new', position: 0 },
        { id: 'g-won', fieldValue: 'won', position: 1 },
        { id: 'g-deleted', fieldValue: 'deleted-stage', position: 2 },
        { id: 'g-new-twice', fieldValue: 'new', position: 3 },
        { id: 'g-none', fieldValue: null, position: 5 },
      ],
    });

    expect(plan).toEqual({
      create: [
        { fieldValue: 'qualified', position: 1 },
        { fieldValue: 'proposition', position: 2 },
      ],
      update: [{ id: 'g-won', position: 3 }],
      remove: ['g-deleted', 'g-new-twice'],
    });
  });

  it('leaves the column of leads without a stage alone', () => {
    const plan = planStageGroups({
      stages: [stage('new', 1)],
      groups: [
        { id: 'g-none', fieldValue: '', position: 9 },
        { id: 'g-new', fieldValue: 'new', position: 0 },
      ],
    });

    expect(plan).toEqual({ create: [], update: [], remove: [] });
  });
});
