import { describe, expect, it } from 'vitest';

import { planMergeTeam } from 'src/crm/lead/merge/utils/plan-merge-team.util';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

const team = (id: string, sequence: number, createdAt: string, leaderId: string | null = null): TeamRow => ({
  id,
  name: id,
  sequence,
  createdAt,
  active: true,
  leaderId,
  useLeads: false,
  useOpportunities: true,
  assignmentOptout: false,
  assignmentMax: 0,
  assignmentDomain: null,
  color: null,
  seedKey: null,
});

const member = (teamId: string, userId: string): MembershipRow => ({
  id: `${teamId}-${userId}`,
  teamId,
  userId,
  active: true,
  assignmentMax: 30,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const TEAMS = [team('team-1', 5, '2026-01-01T00:00:00.000Z', 'manager'), team('team-convert', 10, '2026-01-02T00:00:00.000Z')];
const MEMBERSHIPS = [member('team-1', 'sales-leads'), member('team-convert', 'leads-convert'), member('team-convert', 'salesman')];

describe('planMergeTeam', () => {
  it('gives a salesperson the first team they belong to', () => {
    expect(planMergeTeam({ salespersonId: 'leads-convert', teamId: null, teams: TEAMS, memberships: MEMBERSHIPS })).toBe('team-convert');
  });

  it('keeps the chosen team when the salesperson belongs to it or leads it', () => {
    expect(planMergeTeam({ salespersonId: 'manager', teamId: 'team-1', teams: TEAMS, memberships: MEMBERSHIPS })).toBe('team-1');
  });

  it('empties the team when the salesperson is in no team', () => {
    expect(planMergeTeam({ salespersonId: 'outsider', teamId: 'team-1', teams: TEAMS, memberships: MEMBERSHIPS })).toBeNull();
  });

  it('leaves the team alone when no salesperson is chosen', () => {
    expect(planMergeTeam({ salespersonId: null, teamId: 'team-convert', teams: TEAMS, memberships: MEMBERSHIPS })).toBe('team-convert');
  });

  it('skips archived teams', () => {
    const teams = [{ ...TEAMS[0], active: false }, TEAMS[1]];

    expect(planMergeTeam({ salespersonId: 'manager', teamId: null, teams, memberships: MEMBERSHIPS })).toBeNull();
  });
});
