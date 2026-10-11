import { describe, expect, it } from 'vitest';

import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { planCapacityWrites } from 'src/sales-team/team/utils/plan-capacity-writes.util';

const membership = (id: string, teamId: string, assignmentMax: number, active = true): MembershipRow => ({
  id,
  teamId,
  userId: `user-${id}`,
  active,
  assignmentMax,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('planCapacityWrites', () => {
  it('writes the new sum only where it changed', () => {
    expect(
      planCapacityWrites({
        teams: [
          { id: 'T1', assignmentMax: 60 },
          { id: 'T2', assignmentMax: 90 },
        ],
        memberships: [
          membership('m1', 'T1', 45),
          membership('m2', 'T1', 15),
          membership('m3', 'T1', 15),
          membership('m4', 'T2', 30),
          membership('m5', 'T2', 60),
        ],
      }),
    ).toEqual([{ id: 'T1', assignmentMax: 75 }]);
  });

  it('drops to 0 when the last active member goes', () => {
    expect(planCapacityWrites({ teams: [{ id: 'T1', assignmentMax: 30 }], memberships: [membership('m1', 'T1', 30, false)] })).toEqual([
      { id: 'T1', assignmentMax: 0 },
    ]);
  });
});
