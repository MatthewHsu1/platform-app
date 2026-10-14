import { describe, expect, it } from 'vitest';

import { planOwnerInherit } from 'src/fieldservice/utils/plan-owner-inherit.util';

describe('planOwnerInherit', () => {
  it('inherits the parent owner when empty and keeps a root self-owned marker', () => {
    expect(planOwnerInherit({ personId: null, companyId: null }, { personId: 'p1', companyId: null })).toEqual({ personId: 'p1', companyId: null });
    expect(planOwnerInherit({ personId: null, companyId: 'c1' }, { personId: 'p1', companyId: null })).toEqual({ personId: null, companyId: 'c1' });
  });
});
