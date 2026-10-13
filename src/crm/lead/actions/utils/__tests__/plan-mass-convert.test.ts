import { describe, expect, it } from 'vitest';

import { planDedupeWalkOrder, planFinalList, planMassTeam } from 'src/crm/lead/actions/utils/plan-mass-convert.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

const at = (second: number) => `2026-02-01T00:00:${String(second).padStart(2, '0')}.000Z`;

describe('planDedupeWalkOrder', () => {
  it('walks the leads by priority, highest first, then newest first', () => {
    const leads = [
      leadRow({ id: 'old-low', createdAt: at(1), priority: 'LOW' }),
      leadRow({ id: 'new-low', createdAt: at(3), priority: 'LOW' }),
      leadRow({ id: 'old-high', createdAt: at(2), priority: 'HIGH' }),
    ];

    expect(planDedupeWalkOrder(leads).map((lead) => lead.id)).toEqual(['old-high', 'new-low', 'old-low']);
  });
});

describe('planFinalList', () => {
  it('keeps the selection order without the merged leads, then adds the merge heads at the end', () => {
    expect(
      planFinalList({
        selectedIds: ['lead-1', 'lead-w-partner', 'lead-w-contact', 'lead-w-email', 'lead-w-partner-company', 'lead-w-email-lost'],
        mergedIds: new Set(['lead-1', 'dup-1', 'dup-2', 'lead-w-partner', 'partner-dup-0', 'partner-dup-1']),
        headIds: ['lead-1', 'partner-dup-0'],
      }),
    ).toEqual(['lead-w-contact', 'lead-w-email', 'lead-w-partner-company', 'lead-w-email-lost', 'lead-1', 'partner-dup-0']);
  });
});

describe('planMassTeam', () => {
  const team = (id: string, sequence: number): TeamRow => ({
    id,
    name: id,
    sequence,
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
    leaderId: null,
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
  const teams = [team('team-1', 5), team('team-convert', 10)];
  const memberships = [member('team-1', 'manager'), member('team-convert', 'salesman')];

  it('takes the team of the first chosen salesperson', () => {
    expect(planMassTeam({ salespersonIds: ['salesman'], currentUserId: 'manager', teamId: null, teams, memberships })).toBe('team-convert');
  });

  it("takes the current user's team when no salesperson is chosen and no team is set", () => {
    expect(planMassTeam({ salespersonIds: [], currentUserId: 'manager', teamId: null, teams, memberships })).toBe('team-1');
  });

  it('keeps a team already set when no salesperson is chosen', () => {
    expect(planMassTeam({ salespersonIds: [], currentUserId: 'manager', teamId: 'team-convert', teams, memberships })).toBe('team-convert');
  });

  it('keeps the set team when the first salesperson belongs to it', () => {
    expect(
      planMassTeam({ salespersonIds: ['salesman', 'manager'], currentUserId: null, teamId: 'team-convert', teams, memberships }),
    ).toBe('team-convert');
  });
});
