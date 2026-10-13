import { describe, expect, it } from 'vitest';

import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';
import { planMemberRefusal } from 'src/sales-team/member/utils/plan-member-refusal.util';

const row = (id: string, teamId: string, userId: string, active: boolean, createdAt: string): MemberCandidate => ({
  id,
  teamId,
  userId,
  active,
  createdAt,
});

describe('planMemberRefusal', () => {
  it('allows a new active row when the same pair exists only archived', () => {
    const old = row('m1', 'T', 'U', false, '2026-01-01T00:00:00.000Z');
    const added = row('m2', 'T', 'U', true, '2026-01-02T00:00:00.000Z');
    expect(planMemberRefusal({ candidates: [added], rows: [old, added] })).toEqual([]);
  });

  it('refuses a second active row for the same team and salesperson', () => {
    const kept = row('m2', 'T', 'U', true, '2026-01-02T00:00:00.000Z');
    const added = row('m3', 'T', 'U', true, '2026-01-03T00:00:00.000Z');
    expect(planMemberRefusal({ candidates: [added], rows: [kept, added] })).toEqual(['m3']);
  });

  it('refuses both of two identical active rows saved together', () => {
    const first = row('m1', 'T', 'U', true, '2026-01-01T00:00:00.000Z');
    const second = row('m2', 'T', 'U', true, '2026-01-01T00:00:01.000Z');
    expect(planMemberRefusal({ candidates: [first, second], rows: [first, second] })).toEqual(['m1', 'm2']);
  });

  it('refuses switching an archived row back on while another row of the pair is active', () => {
    const active = row('old', 'T1', 'U', true, '2026-01-01T00:00:00.000Z');
    const reactivated = row('new', 'T1', 'U', true, '2026-01-05T00:00:00.000Z');
    expect(planMemberRefusal({ candidates: [reactivated], rows: [active, reactivated] })).toEqual(['new']);
  });

  it('allows an archived duplicate', () => {
    const active = row('m1', 'T', 'U', true, '2026-01-01T00:00:00.000Z');
    const archived = row('m2', 'T', 'U', false, '2026-01-02T00:00:00.000Z');
    expect(planMemberRefusal({ candidates: [archived], rows: [active, archived] })).toEqual([]);
  });

  it('allows the same salesperson in another team', () => {
    const inTeam1 = row('m1', 'T1', 'U', true, '2026-01-01T00:00:00.000Z');
    const inTeam2 = row('m2', 'T2', 'U', true, '2026-01-02T00:00:00.000Z');
    expect(planMemberRefusal({ candidates: [inTeam2], rows: [inTeam1, inTeam2] })).toEqual([]);
  });
});
