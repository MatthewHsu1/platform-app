import { describe, expect, it } from 'vitest';

import { planAssignToMe } from 'src/helpdesk/actions/utils/plan-assign-to-me.util';

const memberships = [{ teamId: 'teamA', workspaceMemberId: 'userOwn' }];

describe('planAssignToMe', () => {
  it('gives a team member the case', () => {
    expect(planAssignToMe({ teamId: 'teamA', assignedUserId: null, memberId: 'userOwn', memberships })).toEqual({
      kind: 'write',
      data: { assignedUserId: 'userOwn' },
    });
  });

  it('gives anyone a case without a team', () => {
    expect(planAssignToMe({ teamId: null, assignedUserId: 'other', memberId: 'userTeam', memberships }).kind).toBe('write');
  });

  it('refuses someone outside the case team', () => {
    expect(planAssignToMe({ teamId: 'teamA', assignedUserId: null, memberId: 'userTeam', memberships })).toEqual({
      kind: 'refuse',
      reason: "You are not a member of this case's team.",
    });
  });

  it('refuses when the case is already assigned to the clicking user', () => {
    expect(planAssignToMe({ teamId: 'teamA', assignedUserId: 'userOwn', memberId: 'userOwn', memberships })).toEqual({
      kind: 'refuse',
      reason: 'This case is already assigned to you.',
    });
  });
});
