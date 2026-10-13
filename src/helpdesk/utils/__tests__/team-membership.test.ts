import { describe, expect, it } from 'vitest';

import { firstTeamOfMember, isTeamMember } from 'src/helpdesk/utils/team-membership.util';
import { at, context } from 'src/helpdesk/utils/__tests__/case-fixtures';

describe('team membership', () => {
  it('knows who belongs to a team', () => {
    expect(isTeamMember('teamA', 'userOwn', context().memberships)).toBe(true);
    expect(isTeamMember('teamA', 'userTeam', context().memberships)).toBe(false);
  });

  it('takes the first active team of a member by sequence, then by creation', () => {
    const { memberships } = context();
    const teams = [
      { id: 'late', name: 'Late', sequence: 5, active: true, createdAt: at(9), parentId: null },
      { id: 'early', name: 'Early', sequence: 5, active: true, createdAt: at(3), parentId: null },
      { id: 'first', name: 'First', sequence: 1, active: false, createdAt: at(1), parentId: null },
    ];
    const links = [
      ...memberships,
      { teamId: 'late', workspaceMemberId: 'm' },
      { teamId: 'early', workspaceMemberId: 'm' },
      { teamId: 'first', workspaceMemberId: 'm' },
    ];

    expect(firstTeamOfMember('m', teams, links)).toBe('early');
    expect(firstTeamOfMember('nobody', teams, links)).toBeNull();
  });
});
