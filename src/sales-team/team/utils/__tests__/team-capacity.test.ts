import { describe, expect, it } from 'vitest';

import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { teamCapacity } from 'src/sales-team/team/utils/team-capacity.util';

const member = (id: string, teamId: string, assignmentMax: number, patch: Partial<MembershipRow> = {}): MembershipRow => ({
  id,
  teamId,
  userId: `user-${id}`,
  active: true,
  assignmentMax,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('teamCapacity', () => {
  it('adds up the active members, paused ones included', () => {
    const memberships = [
      member('m1', 'T1', 45),
      member('m2', 'T1', 15),
      member('m3', 'T1', 15, { assignmentOptout: true }),
      member('m4', 'T2', 30),
      member('m5', 'T2', 60),
    ];
    expect(teamCapacity('T1', memberships)).toBe(75);
    expect(teamCapacity('T2', memberships)).toBe(90);
  });

  it('leaves out archived members', () => {
    expect(teamCapacity('T1', [member('m1', 'T1', 45), member('m2', 'T1', 30, { active: false })])).toBe(45);
  });

  it('is 0 for a team without members', () => {
    expect(teamCapacity('T3', [])).toBe(0);
  });
});
