import { describe, expect, it } from 'vitest';

import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { defaultTeam } from 'src/sales-team/team/utils/default-team.util';
import { sortTeams } from 'src/sales-team/team/utils/sort-teams.util';

const team = (id: string, sequence: number, createdAt: string, patch: Partial<TeamRow> = {}): TeamRow => ({
  id,
  name: id,
  sequence,
  createdAt,
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

const member = (teamId: string, userId: string, patch: Partial<MembershipRow> = {}): MembershipRow => ({
  id: `${teamId}-${userId}`,
  teamId,
  userId,
  active: true,
  assignmentMax: 30,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

// A (sequence 10, made first), B (5, second), C (5, third): order C, B, A.
const A = team('A', 10, '2026-01-01T00:00:00.000Z');
const B = team('B', 5, '2026-01-02T00:00:00.000Z');
const C = team('C', 5, '2026-01-03T00:00:00.000Z');

const pick = (input: Partial<Parameters<typeof defaultTeam>[0]>) =>
  defaultTeam({
    salespersonId: 'U',
    leadType: 'OPPORTUNITY',
    currentTeamId: null,
    useTypeFilter: true,
    teams: [A, B, C],
    memberships: [],
    ...input,
  });

describe('sortTeams', () => {
  it('orders by sequence, then the newest team first', () => {
    expect(sortTeams([A, B, C]).map((row) => row.id)).toEqual(['C', 'B', 'A']);
  });
});

describe('defaultTeam', () => {
  it('takes the first of the salesperson teams in team order', () => {
    expect(pick({ memberships: [member('A', 'U'), member('C', 'U')] })).toBe('C');
  });

  it('skips a team of the salesperson that does not take this kind of lead', () => {
    const cWithoutPipeline = { ...C, useOpportunities: false };
    expect(pick({ teams: [A, B, cWithoutPipeline], memberships: [member('A', 'U'), member('C', 'U')] })).toBe('A');
  });

  it('falls back to the first team that takes this kind of lead when the salesperson is in no team', () => {
    expect(pick({})).toBe('C');
  });

  it('falls back to the first team when no team takes this kind of lead', () => {
    const teams = [A, B, C].map((row) => ({ ...row, useOpportunities: false }));
    expect(pick({ teams })).toBe('C');
  });

  it('counts a team the salesperson leads', () => {
    expect(pick({ teams: [{ ...A, leaderId: 'U' }, B, C] })).toBe('A');
  });

  it('keeps the current team when the salesperson is one of its members', () => {
    expect(pick({ currentTeamId: 'B', memberships: [member('B', 'U'), member('C', 'U')] })).toBe('B');
  });

  it('keeps the team when the salesperson is cleared', () => {
    expect(pick({ salespersonId: null, currentTeamId: 'B' })).toBe('B');
  });

  it('uses the lead filter for a lead and the pipeline filter for an opportunity', () => {
    const teams = [{ ...A, useLeads: true }, B, C];
    expect(pick({ leadType: 'LEAD', teams, memberships: [member('A', 'U'), member('C', 'U')] })).toBe('A');
  });

  it('ignores an archived team and an archived membership in the search', () => {
    const teams = [A, B, { ...C, active: false }];
    expect(pick({ teams, memberships: [member('C', 'U'), member('B', 'U', { active: false })] })).toBe('B');
  });

  it('keeps an archived current team that still has the salesperson as an active member', () => {
    const teams = [A, { ...B, active: false }, C];
    expect(pick({ teams, currentTeamId: 'B', memberships: [member('B', 'U')] })).toBe('B');
  });

  it('takes the newest team when two teams of the salesperson share a sequence', () => {
    const older = team('Older', 3, '2026-01-01T00:00:00.000Z', { leaderId: 'U' });
    const newer = team('Newer', 3, '2026-02-01T00:00:00.000Z');
    expect(pick({ teams: [older, newer], memberships: [member('Newer', 'U')] })).toBe('Newer');
  });

  it('skips the kind filter when the caller asks for none', () => {
    const cWithoutPipeline = { ...C, useOpportunities: false };
    expect(pick({ useTypeFilter: false, teams: [A, B, cWithoutPipeline], memberships: [member('A', 'U'), member('C', 'U')] })).toBe('C');
  });

  it('gives no team when there is none', () => {
    expect(pick({ teams: [] })).toBeNull();
  });
});
