import { describe, expect, it } from 'vitest';

import { planCaseBoardGroups } from 'src/helpdesk/stage/utils/plan-case-board-groups.util';
import { DEFAULT_STAGES } from 'src/helpdesk/utils/__tests__/case-fixtures';

describe('planCaseBoardGroups', () => {
  it('gives every stage a column in stage order and hides the folded ones', () => {
    expect(planCaseBoardGroups({ stages: DEFAULT_STAGES, groups: [], hideFolded: true })).toEqual({
      create: [
        { fieldValue: 'new', position: 0, isVisible: true },
        { fieldValue: 'inProgress', position: 1, isVisible: true },
        { fieldValue: 'awaiting', position: 2, isVisible: true },
        { fieldValue: 'done', position: 3, isVisible: false },
        { fieldValue: 'cancelled', position: 4, isVisible: false },
        { fieldValue: 'rejected', position: 5, isVisible: false },
      ],
      update: [],
      remove: [],
    });
  });

  it('moves, shows and removes columns as stages change, and keeps the no-value column', () => {
    const stages = DEFAULT_STAGES.filter((row) => row.id !== 'rejected').map((row) => (row.id === 'awaiting' ? { ...row, sequence: 0, fold: true } : row));
    const groups = [
      { id: 'g-none', fieldValue: null, position: 9, isVisible: true },
      { id: 'g-new', fieldValue: 'new', position: 0, isVisible: true },
      { id: 'g-in', fieldValue: 'inProgress', position: 1, isVisible: true },
      { id: 'g-await', fieldValue: 'awaiting', position: 2, isVisible: true },
      { id: 'g-done', fieldValue: 'done', position: 3, isVisible: false },
      { id: 'g-cancel', fieldValue: 'cancelled', position: 4, isVisible: false },
      { id: 'g-rej', fieldValue: 'rejected', position: 5, isVisible: false },
    ];

    expect(planCaseBoardGroups({ stages, groups, hideFolded: true })).toEqual({
      create: [],
      update: [
        { id: 'g-await', position: 0, isVisible: false },
        { id: 'g-new', position: 1, isVisible: true },
        { id: 'g-in', position: 2, isVisible: true },
      ],
      remove: ['g-rej'],
    });
  });

  it('shows folded stages when the board does not fold them', () => {
    expect(planCaseBoardGroups({ stages: [DEFAULT_STAGES[3]], groups: [], hideFolded: false }).create).toEqual([
      { fieldValue: 'done', position: 0, isVisible: true },
    ]);
  });
});
