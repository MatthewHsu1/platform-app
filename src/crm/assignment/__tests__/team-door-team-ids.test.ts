import { describe, expect, it } from 'vitest';

import { makeFindDoorTeam, readTeamDoorTeamIds } from 'src/crm/assignment/team-door-team-ids';

const run = (team: { useLeads: boolean | null; useOpportunities: boolean | null } | null, body: Record<string, unknown> = { teamId: 'T' }) =>
  readTeamDoorTeamIds({ body, locale: 'en', findTeam: async () => team });

describe('the team button route', () => {
  it('runs on a team that uses leads or a pipeline', async () => {
    expect(await run({ useLeads: true, useOpportunities: false })).toEqual({ teamIds: ['T'] });
    expect(await run({ useLeads: false, useOpportunities: true })).toEqual({ teamIds: ['T'] });
  });

  it('refuses a team that uses neither leads nor a pipeline', async () => {
    expect(await run({ useLeads: false, useOpportunities: false })).toEqual({
      status: 409,
      error: 'This team uses neither leads nor a pipeline.',
    });
  });

  it('answers a missing team id and a team the user cannot see', async () => {
    expect(await run({ useLeads: true, useOpportunities: true }, {})).toEqual({ status: 400, error: 'teamId is required.' });
    expect(await run(null)).toEqual({ status: 404, error: 'Team not found.' });
  });

  it('answers 404 for a team id that matches no team, without an error from the read', async () => {
    const findTeam = makeFindDoorTeam(async () => ({ data: { crmTeams: { edges: [] } } }));

    expect(await readTeamDoorTeamIds({ body: { teamId: 'missing' }, locale: 'en', findTeam })).toEqual({ status: 404, error: 'Team not found.' });
  });

  it('reads the found team with its leads and pipeline switches', async () => {
    const findTeam = makeFindDoorTeam(async () => ({ data: { crmTeams: { edges: [{ node: { useLeads: false, useOpportunities: true } }] } } }));

    expect(await readTeamDoorTeamIds({ body: { teamId: 'T' }, locale: 'en', findTeam })).toEqual({ teamIds: ['T'] });
  });
});
