import { describe, expect, it } from 'vitest';

import { assignmentQuota } from 'src/crm/assignment/utils/assignment-quota.util';

describe('assignmentQuota', () => {
  it.each([
    [0, 0],
    [14, 0],
    [15, 1],
    [30, 1],
    [44, 1],
    [45, 2],
    [60, 2],
    [75, 3],
    [150, 5],
  ])('gives a monthly capacity of %i a daily quota of %i when the quota is forced', (assignmentMax, expected) => {
    expect(assignmentQuota({ assignmentMax, forceQuota: true, leadDayCount: 99 })).toBe(expected);
  });

  it('takes away the leads given in the last 24 hours when not forced', () => {
    expect(assignmentQuota({ assignmentMax: 45, forceQuota: false, leadDayCount: 30 })).toBe(-28);
    expect(assignmentQuota({ assignmentMax: 45, forceQuota: false, leadDayCount: 0 })).toBe(2);
    expect(assignmentQuota({ assignmentMax: 30, forceQuota: false, leadDayCount: 2 })).toBe(-1);
  });
});
