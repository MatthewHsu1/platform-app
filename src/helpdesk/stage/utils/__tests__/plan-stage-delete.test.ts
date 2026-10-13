import { describe, expect, it } from 'vitest';

import { planStageDelete } from 'src/helpdesk/stage/utils/plan-stage-delete.util';

describe('planStageDelete', () => {
  it('keeps a stage an archived case still uses, and lets a stage only deleted cases used go', () => {
    const plan = planStageDelete({
      deletedStageIds: ['used', 'free'],
      cases: [
        { id: 'k1', stageId: 'used', active: false, deletedAt: null },
        { id: 'k2', stageId: 'free', active: true, deletedAt: '2026-10-09T00:00:00.000Z' },
      ],
    });

    expect(plan).toEqual({ restore: ['used'], allowed: ['free'] });
  });
});
