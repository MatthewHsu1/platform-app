import { describe, expect, it } from 'vitest';

import { makeFakeAssignmentApi, makeLead, makeMember, makeTeam, NOW } from 'src/crm/assignment/__tests__/fakes/fake-assignment-api';
import { makeAssignLeads } from 'src/crm/assignment/run-assignment';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { GraphqlInputError } from 'src/shared/twenty-graphql';

const created = (minute: number) => new Date(Date.UTC(2026, 9, 8, 0, minute)).toISOString();

describe('assignLeads', () => {
  it('shares new leads between two teams by capacity and gives each salesperson a daily quota', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('A', { sequence: 1, assignmentMax: 30 }), makeTeam('B', { sequence: 2, assignmentMax: 60 })],
      memberships: [makeMember('ma', 'A', 'ua', 30), makeMember('mb', 'B', 'ub', 60)],
      leads: Array.from({ length: 9 }, (_, index) => makeLead(`l${index + 1}`, { createdAt: created(index) })),
      random: [0.1, 0.5],
    });

    const result = await makeAssignLeads(api)({ teamIds: ['A', 'B'], forceQuota: true, creationDeltaDays: 0, door: 'SETTINGS_BUTTON', requestedBy: 'Ann' });

    expect(result.teams.A.assigned).toHaveLength(5);
    expect(result.teams.B.assigned).toHaveLength(4);
    expect(result.members.ma).toEqual({ assigned: ['l1'], quota: 1 });
    expect(result.members.mb).toEqual({ assigned: ['l2', 'l4'], quota: 2 });
    expect(api.leads.get('l1')).toMatchObject({ teamId: 'A', salespersonId: 'ua', dateOpen: NOW.toISOString(), leadType: 'OPPORTUNITY' });
    expect([...api.leads.values()].filter((lead) => lead.teamId === null)).toEqual([]);
  });

  it('allocates only leads that match the team filter', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 30, assignmentDomain: 'warm' })],
      memberships: [makeMember('m', 'T', 'u', 30)],
      leads: [makeLead('cold', { probability: 10 }), makeLead('hot', { probability: 40 })],
      filters: { warm: { probability: { gte: 20 } } },
    });

    await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(api.leads.get('cold')?.teamId).toBeNull();
    expect(api.leads.get('hot')).toMatchObject({ teamId: 'T', salespersonId: 'u' });
  });

  it('skips a lead another writer assigned first and keeps the quota for the next lead', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 60 })],
      memberships: [makeMember('m', 'T', 'u', 60)],
      leads: [
        makeLead('l1', { teamId: 'T', probability: 90 }),
        makeLead('l2', { teamId: 'T', probability: 50 }),
        makeLead('l3', { teamId: 'T', probability: 10 }),
      ],
    });

    api.beforeWrite = (leadId) => {
      if (leadId === 'l1') {
        api.leads.set('l1', { ...(api.leads.get('l1') as LeadRow), salespersonId: 'someone-else' });
      }
    };
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.members.m.assigned).toEqual(['l2', 'l3']);
    expect(api.leads.get('l1')?.salespersonId).toBe('someone-else');
  });

  it('gives no lead twice when a stopped scheduled run starts again', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 90 })],
      memberships: [makeMember('m', 'T', 'u', 90)],
      leads: Array.from({ length: 5 }, (_, index) => makeLead(`l${index + 1}`, { teamId: 'T', createdAt: created(index) })),
    });
    const run = makeAssignLeads(api);
    const input = { teamIds: ['T'], forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE' as const, requestedBy: null };

    api.failAfterWrites = 2;
    await expect(run(input)).rejects.toThrow('The run was stopped');
    api.failAfterWrites = undefined;
    await run(input);

    const written = api.writes.map((write) => write.leadId);

    expect(written).toEqual(['l1', 'l2', 'l3']);
    expect(new Set(written).size).toBe(written.length);
  });

  it('merges a new lead into an existing opportunity that keeps its team and salesperson', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('Dupe', { assignmentMax: 10 })],
      memberships: [makeMember('m', 'Dupe', 'u', 10)],
      leads: [
        makeLead('master', { leadType: 'OPPORTUNITY', teamId: 'Sales', salespersonId: 'boss', dateOpen: '2026-10-01T00:00:00.000Z', probability: 50 }),
        makeLead('dupe', { probability: 10 }),
      ],
      duplicates: { dupe: ['dupe', 'master'] },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['Dupe'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(api.teamWrites).toEqual([{ leadId: 'dupe', teamId: 'Dupe' }]);
    expect(api.merges).toEqual([['dupe', 'master']]);
    expect(api.leads.has('dupe')).toBe(false);
    expect(api.leads.get('master')).toMatchObject({ teamId: 'Sales', salespersonId: 'boss' });
    expect(result.teams.Dupe).toEqual({ assigned: [], merged: ['master'], duplicates: ['dupe'] });
  });

  it('merges only the duplicates that are still there', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('D', { assignmentMax: 10 })],
      memberships: [],
      leads: [
        makeLead('new'),
        makeLead('master', { leadType: 'OPPORTUNITY', teamId: 'Sales', salespersonId: 'boss', dateOpen: '2026-10-01T00:00:00.000Z' }),
        makeLead('gone', { teamId: 'Other' }),
      ],
      duplicates: { new: ['new', 'master', 'gone'] },
    });

    api.beforeWrite = (leadId) => {
      if (leadId === 'new') {
        api.leads.delete('gone');
      }
    };
    const result = await makeAssignLeads(api)({ teamIds: ['D'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(api.merges).toEqual([['new', 'master']]);
    expect(result.teams.D).toEqual({ assigned: [], merged: ['master'], duplicates: ['new'] });
  });

  it('stops the whole run when a team filter cannot be used, and names the team and the problem', async () => {
    const api = makeFakeAssignmentApi({
      teams: [
        makeTeam('A', { name: 'Web', sequence: 1, assignmentMax: 30, assignmentDomain: 'rating' }),
        makeTeam('B', { name: 'Sales', sequence: 2, assignmentMax: 30 }),
      ],
      memberships: [makeMember('m', 'B', 'u', 30)],
      leads: [makeLead('l1')],
      filters: { rating: 'broken' },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['A', 'B'], forceQuota: true, creationDeltaDays: 0, door: 'SETTINGS_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual(['Lead assignment stopped: the filter of team Web cannot be used. Unknown field "rating".']);
    expect(result.messages).toEqual(result.errors);
    expect(api.leads.get('l1')).toMatchObject({ teamId: null, salespersonId: null });
    expect(api.notes).toEqual([]);
  });

  it('also stops when the server refuses a team filter', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('A', { name: 'Web', assignmentMax: 30, assignmentDomain: 'language' })],
      memberships: [],
      leads: [makeLead('l1')],
      filters: { language: { language: { startsWithAny: 'fr' } } },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['A'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual(['Lead assignment stopped: the filter of team Web cannot be used. Find leads: Unknown operator startsWithAny']);
    expect(api.leads.get('l1')?.teamId).toBeNull();
  });

  it('stops at a salesperson whose filter cannot be used, after the leads went to the teams', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { name: 'Sales', assignmentMax: 30 })],
      memberships: [makeMember('m', 'T', 'u', 30, { name: 'Ann Lee', assignmentDomainPreferred: 'size' })],
      leads: [makeLead('l1')],
      filters: { size: 'broken' },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual(['Lead assignment stopped: the filters of Ann Lee in team Sales cannot be used. Unknown field "size".']);
    expect(api.leads.get('l1')).toMatchObject({ teamId: 'T', salespersonId: null });
    expect(api.writes).toEqual([]);
    expect(api.notes).toEqual([]);
  });

  it('fails the run, without blaming the filter, when a filtered search fails for another reason', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('A', { name: 'Web', assignmentMax: 30, assignmentDomain: 'warm' })],
      memberships: [],
      leads: [makeLead('l1')],
      filters: { warm: { probability: { gte: 20 } } },
    });

    api.findLeads = async () => {
      throw new Error('Find leads: Internal server error');
    };

    await expect(
      makeAssignLeads(api)({ teamIds: ['A'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' }),
    ).rejects.toThrow('Find leads: Internal server error');
  });

  it('fails the run when a filter cannot read the records it names', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('A', { name: 'Web', assignmentMax: 30, assignmentDomain: 'customer' })],
      memberships: [],
      leads: [makeLead('l1')],
      filters: { customer: new Error('Find companies: Internal server error') },
    });

    await expect(
      makeAssignLeads(api)({ teamIds: ['A'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' }),
    ).rejects.toThrow('Find companies: Internal server error');
  });

  it('never reports a filter problem for a team without a filter', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('A', { name: 'Web', assignmentMax: 30 })],
      memberships: [],
      leads: [makeLead('l1')],
    });

    api.findLeads = async () => {
      throw new GraphqlInputError('Find leads: Invalid filter value');
    };

    await expect(
      makeAssignLeads(api)({ teamIds: ['A'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' }),
    ).rejects.toThrow('Find leads: Invalid filter value');
  });

  it('stops at a salesperson whose filter the server refuses', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { name: 'Sales', assignmentMax: 30 })],
      memberships: [makeMember('m', 'T', 'u', 30, { name: 'Ann Lee', assignmentDomain: 'language' })],
      leads: [makeLead('l1', { teamId: 'T' })],
      filters: { language: { language: { startsWithAny: 'fr' } } },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual(['Lead assignment stopped: the filters of Ann Lee in team Sales cannot be used. Find leads: Unknown operator startsWithAny']);
    expect(api.writes).toEqual([]);
  });

  it("fails the run when a salesperson's filtered search fails for another reason", async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { name: 'Sales', assignmentMax: 0 })],
      memberships: [makeMember('m', 'T', 'u', 30, { name: 'Ann Lee', assignmentDomain: 'warm' })],
      leads: [makeLead('l1', { teamId: 'T' })],
      filters: { warm: { probability: { gte: 0 } } },
    });
    const findLeads = api.findLeads;

    api.findLeads = async (filter) => {
      if (JSON.stringify(filter).includes('"gte":0')) {
        throw new Error('Find leads: Internal server error');
      }
      return findLeads(filter);
    };

    await expect(
      makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' }),
    ).rejects.toThrow('Find leads: Internal server error');
    expect(api.writes).toEqual([]);
  });

  it('neither counts, merges nor moves a lead another writer put on a team first', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 30 })],
      memberships: [],
      leads: [makeLead('l1'), makeLead('l2', { teamId: 'Other' })],
      duplicates: { l1: ['l1', 'l2'] },
    });

    api.beforeWrite = (leadId) => {
      if (leadId === 'l1') {
        api.leads.set('l1', { ...(api.leads.get('l1') as LeadRow), teamId: 'Other' });
      }
    };
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(api.teamWrites).toEqual([]);
    expect(api.merges).toEqual([]);
    expect(api.leads.get('l1')?.teamId).toBe('Other');
    expect(result.teams.T).toEqual({ assigned: [], merged: [], duplicates: [] });
  });

  it('gives a lead to the next salesperson when the one before is paused, even with a filter that cannot be used', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 60 })],
      memberships: [
        makeMember('paused', 'T', 'u1', 30, { assignmentOptout: true, assignmentDomain: 'size' }),
        makeMember('m', 'T', 'u2', 30),
      ],
      leads: [makeLead('l1', { teamId: 'T' })],
      filters: { size: 'broken' },
    });

    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual([]);
    expect(api.leads.get('l1')?.salespersonId).toBe('u2');
  });

  it('writes the same note on each team of a manual run and none for the schedule', async () => {
    const setup = () =>
      makeFakeAssignmentApi({
        teams: [makeTeam('T', { name: 'Sales', assignmentMax: 30 })],
        memberships: [makeMember('m', 'T', 'u', 30)],
        leads: [makeLead('l1')],
      });
    const manual = setup();
    const scheduled = setup();

    await makeAssignLeads(manual)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann Lee' });
    await makeAssignLeads(scheduled)({ teamIds: ['T'], forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE', requestedBy: null });

    expect(manual.notes).toEqual([
      {
        teamId: 'T',
        body: 'Lead assignment requested by Ann Lee.\n\n1 leads were allocated to Sales.\n\n1 leads were assigned among 1 salespeople.',
      },
    ]);
    expect(scheduled.notes).toEqual([]);
  });

  it('gives nothing to a member whose quota for the day is already used', async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 30 })],
      memberships: [makeMember('m', 'T', 'u', 30)],
      leads: [
        makeLead('given1', { teamId: 'T', salespersonId: 'u', dateOpen: '2026-10-09T08:00:00.000Z' }),
        makeLead('given2', { teamId: 'T', salespersonId: 'u', dateOpen: '2026-10-09T09:00:00.000Z', wonStatus: 'LOST' }),
        makeLead('waiting', { teamId: 'T' }),
      ],
    });

    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE', requestedBy: null });

    expect(result.members).toEqual({});
    expect(api.leads.get('waiting')?.salespersonId).toBeNull();
  });
});

describe('assignLeads with the assignment plug', () => {
  const setup = (leftOut: 'DEFAULT' | 'UNTOUCHED', onError: 'DEFAULT' | 'SKIP' = 'DEFAULT') => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 30 })],
      memberships: [makeMember('m', 'T', 'u', 30)],
      leads: [makeLead('l1'), makeLead('l2'), makeLead('l3')],
    });

    api.readPlugConfig = async () => ({ enabled: true, target: { kind: 'route', path: '/acme/assign' }, timeoutSeconds: 30, onError, leftOut });
    return api;
  };

  it('lets the plug assign leads and runs the built-in steps on the rest', async () => {
    const api = setup('DEFAULT');
    let sentLeads: string[] = [];

    api.callAssignmentPlug = async (request) => {
      sentLeads = request.leads.map((lead) => lead.id);
      return {
        kind: 'answer',
        payload: {
          assignments: [
            { leadId: 'l1', teamId: 'T', salespersonId: 'u' },
            { leadId: 'l2', teamId: 'T', salespersonId: null },
          ],
        },
      };
    };
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(sentLeads).toEqual(['l1', 'l2', 'l3']);
    expect(result.plug).toEqual({ answered: 2, written: ['l1', 'l2'] });
    expect(api.leads.get('l1')).toMatchObject({ teamId: 'T', salespersonId: 'u', leadType: 'OPPORTUNITY' });
    expect(api.leads.get('l2')).toMatchObject({ teamId: 'T', salespersonId: 'u' });
    expect(api.leads.get('l3')).toMatchObject({ teamId: 'T', salespersonId: null });
  });

  it('leaves the leads the answer did not name alone when the settings say so', async () => {
    const api = setup('UNTOUCHED');

    api.callAssignmentPlug = async () => ({ kind: 'answer', payload: { assignments: [{ leadId: 'l1', teamId: 'T', salespersonId: null }] } });
    await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(api.leads.get('l1')?.teamId).toBe('T');
    expect(api.leads.get('l2')?.teamId).toBeNull();
    expect(api.writes).toEqual([]);
  });

  it('runs the built-in steps when the plug fails, and reports the failure', async () => {
    const api = setup('DEFAULT', 'DEFAULT');

    api.callAssignmentPlug = async () => ({
      kind: 'error',
      failure: { message: 'The plug point did not answer within {seconds} s.', values: { seconds: 30 } },
    });
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual([]);
    expect(result.messages[0]).toBe('The assignment plug failed: The plug point did not answer within 30 s.');
    expect([...api.leads.values()].filter((lead) => lead.teamId === 'T')).toHaveLength(3);
  });

  it('does nothing when the plug fails and the settings say to skip', async () => {
    const api = setup('DEFAULT', 'SKIP');

    api.callAssignmentPlug = async () => ({ kind: 'error', failure: { message: 'The plug point answered with HTTP {status}.', values: { status: 500 } } });
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.errors).toEqual(['The assignment plug failed: The plug point answered with HTTP 500.']);
    expect(result.messages).toEqual(['The assignment plug failed: The plug point answered with HTTP 500.']);
    expect(api.teamWrites).toEqual([]);
    expect(api.writes).toEqual([]);
  });

  it("counts the plug's assignments in a salesperson's daily quota on a scheduled run", async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 60 })],
      memberships: [makeMember('m', 'T', 'u', 60)],
      leads: [makeLead('l1'), makeLead('l2'), makeLead('l3')],
    });

    api.readPlugConfig = async () => ({ enabled: true, target: { kind: 'route', path: '/acme/assign' }, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT' });
    api.callAssignmentPlug = async () => ({ kind: 'answer', payload: { assignments: [{ leadId: 'l1', teamId: 'T', salespersonId: 'u' }] } });
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE', requestedBy: null });

    expect(result.members.m).toEqual({ assigned: ['l2'], quota: 1 });
    expect(api.leads.get('l3')).toMatchObject({ teamId: 'T', salespersonId: null });
  });

  it("keeps the plug's line in the report when a filter stops the run afterwards", async () => {
    const api = makeFakeAssignmentApi({
      teams: [makeTeam('T', { assignmentMax: 30, assignmentDomain: 'bad' })],
      memberships: [makeMember('m', 'T', 'u', 30)],
      leads: [makeLead('l1'), makeLead('l2')],
      filters: { bad: 'broken' },
    });

    api.readPlugConfig = async () => ({ enabled: true, target: { kind: 'route', path: '/acme/assign' }, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT' });
    api.callAssignmentPlug = async () => ({ kind: 'answer', payload: { assignments: [{ leadId: 'l1', teamId: 'T', salespersonId: 'u' }] } });
    const result = await makeAssignLeads(api)({ teamIds: ['T'], forceQuota: true, creationDeltaDays: 0, door: 'TEAM_BUTTON', requestedBy: 'Ann' });

    expect(result.messages[0]).toBe('1 leads were assigned by the assignment plug.');
    expect(result.errors).toHaveLength(1);
  });
});
