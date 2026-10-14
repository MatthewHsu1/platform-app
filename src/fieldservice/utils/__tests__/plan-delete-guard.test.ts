import { describe, expect, it } from 'vitest';

import { planDeleteGuard } from 'src/fieldservice/utils/plan-delete-guard.util';

describe('planDeleteGuard', () => {
  it('refuses deletes outside the default stage', () => {
    expect(planDeleteGuard(false)).toEqual({ allow: false, note: 'delete-only-in-default-stage' });
    expect(planDeleteGuard(true)).toEqual({ allow: true, note: null });
  });
});
