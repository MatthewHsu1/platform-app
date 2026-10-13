import { describe, expect, it } from 'vitest';

import { readLeadRow } from 'src/crm/lead/lead-selection';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { planTeamDefault } from 'src/crm/lead/utils/plan-team-default.util';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

const team = (id: string, sequence: number, patch: Partial<TeamRow>): TeamRow => ({
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
  ...patch,
});

const membership = (id: string, teamId: string, createdAt: string): MembershipRow => ({
  id,
  teamId,
  userId: 'U',
  active: true,
  assignmentMax: 30,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt,
});

// U is in a pipeline team and in a team that takes only leads; X's team has neither.
const context: LeadContext = {
  stages: [],
  recurringPlanMonths: new Map(),
  teams: [team('PIPE', 1, {}), team('LEADS', 2, { useLeads: true, useOpportunities: false }), team('XTEAM', 3, { leaderId: 'X' })],
  memberships: [membership('m1', 'PIPE', '2026-01-01T00:00:00.000Z'), membership('m2', 'LEADS', '2026-01-02T00:00:00.000Z')],
  people: new Map(),
  companies: new Map(),
};

const lead = (values: Record<string, unknown>): LeadRow =>
  readLeadRow({ id: 'L', createdAt: '2026-09-01T09:00:00.000Z', leadType: 'OPPORTUNITY', ...values });

describe('planTeamDefault', () => {
  it('gives a new opportunity with a salesperson the salesperson team', () => {
    expect(
      planTeamDefault({ operation: 'created', before: null, lead: lead({ salespersonId: 'U' }), written: new Set(['salespersonId']), context }),
    ).toEqual({ teamId: 'PIPE' });
  });

  it('gives a lead the salesperson team that takes leads', () => {
    expect(
      planTeamDefault({ operation: 'created', before: null, lead: lead({ salespersonId: 'U', leadType: 'LEAD' }), written: new Set(), context }),
    ).toEqual({ teamId: 'LEADS' });
  });

  it('keeps a team the save wrote itself', () => {
    expect(
      planTeamDefault({
        operation: 'created',
        before: null,
        lead: lead({ salespersonId: 'OTHER', teamId: 'LEADS' }),
        written: new Set(['salespersonId', 'teamId']),
        context,
      }),
    ).toEqual({});
  });

  it('moves the lead to the team of a new salesperson', () => {
    const before = lead({ salespersonId: 'X', teamId: 'XTEAM' });

    expect(
      planTeamDefault({ operation: 'updated', before, lead: { ...before, salespersonId: 'U' }, written: new Set(['salespersonId']), context }),
    ).toEqual({ teamId: 'PIPE' });
  });

  it('keeps the current team of a new salesperson who is its member, even a team that does not take this kind of lead', () => {
    const before = lead({ salespersonId: 'X', teamId: 'LEADS' });

    expect(
      planTeamDefault({ operation: 'updated', before, lead: { ...before, salespersonId: 'U' }, written: new Set(['salespersonId']), context }),
    ).toEqual({});
  });

  it('looks for a team again when the type changes', () => {
    const before = lead({ salespersonId: 'U', teamId: 'XTEAM', leadType: 'LEAD' });

    expect(
      planTeamDefault({ operation: 'updated', before, lead: { ...before, leadType: 'OPPORTUNITY' }, written: new Set(['leadType']), context }),
    ).toEqual({ teamId: 'PIPE' });
  });

  it('does nothing when neither the salesperson nor the type changed', () => {
    const before = lead({ salespersonId: 'U', teamId: 'LEADS' });

    expect(planTeamDefault({ operation: 'updated', before, lead: { ...before }, written: new Set(['name']), context })).toEqual({});
  });

  it('keeps the team when the salesperson is cleared', () => {
    const before = lead({ salespersonId: 'U', teamId: 'PIPE' });

    expect(
      planTeamDefault({ operation: 'updated', before, lead: { ...before, salespersonId: null }, written: new Set(['salespersonId']), context }),
    ).toEqual({});
  });
});
