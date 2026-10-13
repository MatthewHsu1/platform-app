import { describe, expect, it } from 'vitest';

import { planSlaRefresh } from 'src/helpdesk-sla/utils/plan-sla-refresh.util';

describe('planSlaRefresh', () => {
  it('removes rows of policies that no longer apply and adds rows for new ones, keeping the rest', () => {
    expect(planSlaRefresh({ rows: [{ id: 'r1', slaId: 'generic' }], matching: [] })).toEqual({ removeRowIds: ['r1'], addPolicyIds: [] });
    expect(planSlaRefresh({ rows: [], matching: ['generic'] })).toEqual({ removeRowIds: [], addPolicyIds: ['generic'] });
    expect(planSlaRefresh({ rows: [{ id: 'r1', slaId: 'generic' }], matching: ['generic', 'newSla'] })).toEqual({
      removeRowIds: [],
      addPolicyIds: ['newSla'],
    });
  });
});
