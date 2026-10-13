import { describe, expect, it } from 'vitest';

import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';
import { planMembershipArchive } from 'src/sales-team/member/utils/plan-membership-archive.util';

const row = (id: string, teamId: string, userId: string, active: boolean, createdAt = '2026-01-01T00:00:00.000Z'): MemberCandidate => ({
  id,
  teamId,
  userId,
  active,
  createdAt,
});

describe('planMembershipArchive', () => {
  it('archives the other team membership when a salesperson joins a team', () => {
    const inTeam1 = row('st1', 'T1', 'U', true);
    const inNew = row('nt', 'NEW', 'U', true, '2026-01-02T00:00:00.000Z');
    expect(planMembershipArchive({ accepted: [inNew], rows: [inTeam1, inNew], membershipMulti: false })).toEqual(['st1']);
  });

  it('leaves archived memberships alone and archives only active ones elsewhere', () => {
    const oldTeam1 = row('old-st1', 'T1', 'U', false);
    const newTeam1 = row('new-st1', 'T1', 'U', true, '2026-01-03T00:00:00.000Z');
    const inNew = row('nt', 'NEW', 'U', true, '2026-01-02T00:00:00.000Z');
    expect(planMembershipArchive({ accepted: [newTeam1], rows: [oldTeam1, newTeam1, inNew], membershipMulti: false })).toEqual(['nt']);
  });

  it('archives the other teams when an archived membership is switched back on', () => {
    const newTeam1 = row('new-st1', 'T1', 'U', true);
    const reactivated = row('nt', 'NEW', 'U', true);
    expect(planMembershipArchive({ accepted: [reactivated], rows: [newTeam1, reactivated], membershipMulti: false })).toEqual(['new-st1']);
  });

  it('archives nothing when salespeople may be in several teams', () => {
    const inTeam1 = row('st1', 'T1', 'U', true);
    const inNew = row('nt', 'NEW', 'U', true);
    expect(planMembershipArchive({ accepted: [inNew], rows: [inTeam1, inNew], membershipMulti: true })).toEqual([]);
  });

  it('keeps both of two new memberships of one salesperson in different teams saved together', () => {
    const first = row('a', 'TA', 'U', true, '2026-01-01T00:00:00.000Z');
    const second = row('b', 'TB', 'U', true, '2026-01-01T00:00:01.000Z');
    expect(planMembershipArchive({ accepted: [second, first], rows: [first, second], membershipMulti: false })).toEqual([]);
  });

  it('still archives an older membership in a third team when two new ones are saved together', () => {
    const older = row('old', 'T1', 'U', true);
    const first = row('a', 'TA', 'U', true, '2026-01-02T00:00:00.000Z');
    const second = row('b', 'TB', 'U', true, '2026-01-02T00:00:01.000Z');
    expect(planMembershipArchive({ accepted: [first, second], rows: [older, first, second], membershipMulti: false })).toEqual(['old']);
  });
});
