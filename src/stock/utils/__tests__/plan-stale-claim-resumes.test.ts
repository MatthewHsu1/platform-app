import { describe, expect, it } from 'vitest';

import { planStaleClaimResumes } from 'src/stock/utils/plan-stale-claim-resumes.util';

describe('planStaleClaimResumes', () => {
  it('sends each stale claim to the resume entry point of its action', () => {
    expect(
      planStaleClaimResumes({
        actions: ['validate', 'relocate'],
        claims: [{ key: 'validate:p1' }, { key: 'relocate:q1' }, { key: 'order:op1' }, { key: 'broken' }],
      }),
    ).toEqual({
      resume: [
        { key: 'validate:p1', action: 'validate', recordId: 'p1' },
        { key: 'relocate:q1', action: 'relocate', recordId: 'q1' },
      ],
      unknown: ['order:op1', 'broken'],
    });
  });
});
