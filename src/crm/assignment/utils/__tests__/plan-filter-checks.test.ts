import { describe, expect, it } from 'vitest';

import { planFilterChecks } from 'src/crm/assignment/utils/plan-filter-checks.util';

const change = (
  overrides: Partial<{ field: 'assignmentDomain' | 'assignmentDomainPreferred'; before: string | null; after: string | null; staffChange: boolean }>,
) => ({
  recordId: 'm1',
  operation: 'updated' as const,
  field: 'assignmentDomain' as const,
  before: null,
  after: '{"rules":[]}',
  staffChange: true,
  workspaceMemberId: 'wm1',
  ...overrides,
});

describe('planFilterChecks', () => {
  it('checks a filter a person changed', () => {
    expect(planFilterChecks([change({})])).toEqual([
      { recordId: 'm1', operation: 'updated', field: 'assignmentDomain', before: null, after: '{"rules":[]}', workspaceMemberId: 'wm1' },
    ]);
  });

  it('checks each changed filter field on its own', () => {
    const checks = planFilterChecks([
      change({ field: 'assignmentDomain', before: 'a', after: 'c' }),
      change({ field: 'assignmentDomainPreferred', before: 'b', after: 'd' }),
    ]);

    expect(checks.map((check) => check.field)).toEqual(['assignmentDomain', 'assignmentDomainPreferred']);
  });

  it('never refuses an emptied filter', () => {
    expect(planFilterChecks([change({ before: 'a', after: '' }), change({ before: 'a', after: null })])).toEqual([]);
  });

  it("leaves the app's own writes and unchanged values alone", () => {
    expect(
      planFilterChecks([change({ before: 'a', after: 'b', staffChange: false }), change({ before: 'a', after: 'a' })]),
    ).toEqual([]);
  });
});
