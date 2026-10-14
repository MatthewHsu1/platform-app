import { describe, expect, it } from 'vitest';

import { planStageGuard } from 'src/fieldservice/utils/plan-stage-guard.util';

describe('planStageGuard', () => {
  it('refuses a manual move to Completed with a put-back to the old status', () => {
    expect(planStageGuard('OPEN', 'COMPLETED', false)).toEqual({ putBackTo: 'OPEN', note: 'manual-complete-refused' });
  });

  it('allows the Complete button path and non-complete moves', () => {
    expect(planStageGuard('OPEN', 'COMPLETED', true)).toEqual({ putBackTo: null, note: null });
    expect(planStageGuard('OPEN', 'CANCELLED', false)).toEqual({ putBackTo: null, note: null });
    expect(planStageGuard('OPEN', undefined, false)).toEqual({ putBackTo: null, note: null });
  });
});
