import { describe, expect, it } from 'vitest';

import { LOST_REASON_IN_USE_MESSAGE, makeRunLostReasonTrigger } from 'src/crm/lost-reason/run-lost-reason-trigger';

describe('lost reason trigger', () => {
  it('puts back a deleted reason a lead still uses, and lets an unused one go', async () => {
    const restored: { id: string; reason: string }[] = [];

    await makeRunLostReasonTrigger({
      reasonIdsUsedByLeads: async (ids) => new Set(ids.filter((id) => id === 'used')),
      restoreReason: async (id, reason) => {
        restored.push({ id, reason });
      },
      memberLocale: async () => 'en',
      translate: (_locale, message) => message,
    })({
      operation: 'deleted',
      events: [
        { recordId: 'used', properties: {} },
        { recordId: 'unused', properties: {} },
      ],
    });

    expect(restored).toEqual([{ id: 'used', reason: LOST_REASON_IN_USE_MESSAGE }]);
  });
});
