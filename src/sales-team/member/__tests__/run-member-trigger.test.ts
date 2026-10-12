import { describe, expect, it } from 'vitest';

import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';
import { makeRunMemberTrigger } from 'src/sales-team/member/run-member-trigger';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';

const STAFF = { source: 'MANUAL' };
const APP = { source: 'APPLICATION' };

const row = (id: string, teamId: string, active: boolean, createdAt: string, userId = 'U'): MemberCandidate => ({
  id,
  teamId,
  userId,
  active,
  createdAt,
});

const makeApi = (rows: MemberCandidate[], membershipMulti = false, refusedByFilter: string[] = []) => {
  const writes: string[] = [];
  const capacity: string[][] = [];

  const api = {
    membershipsOfUsers: async (userIds: string[]) => rows.filter((candidate) => userIds.includes(candidate.userId ?? '')),
    userNames: async () =>
      new Map([
        ['U', 'Ann Lee'],
        ['M', 'Max Roe'],
      ]),
    destroyMembers: async (ids: string[]) => {
      writes.push(`destroy ${ids.join(',')}`);
    },
    softDeleteMember: async (id: string) => {
      writes.push(`trash ${id}`);
    },
    putBackMember: async (id: string, data: Record<string, unknown>) => {
      writes.push(`put back ${id} ${JSON.stringify(data)}`);
    },
    noteOnTeam: async (teamId: string, reason: string) => {
      writes.push(`note ${teamId} ${reason}`);
    },
    archiveMembers: async (ids: string[]) => {
      writes.push(`archive ${ids.join(',')}`);
    },
    renameMember: async (id: string, name: string | null) => {
      writes.push(`name ${id} ${name}`);
    },
    readSettings: async () => ({ membershipMulti }),
    recomputeCapacity: async (teamIds: string[]) => {
      capacity.push([...teamIds].sort());
    },
    checkAssignmentFilters: async (changes: AssignmentFilterChange[]) => {
      writes.push(`check ${changes.map((change) => `${change.operation} ${change.recordId} ${change.field}`).join(',')}`);
      return { refused: refusedByFilter.map((recordId) => ({ recordId, reason: `refused ${recordId}` })), problems: [] };
    },
    memberLocale: async () => 'en',
    translate: (_locale: string | null, message: string, values: Record<string, string> = {}) =>
      message.replace('{name}', values.name ?? ''),
  };

  return { api, writes, capacity };
};

const duplicateNote = (teamId: string) => `note ${teamId} ${TEAM_MESSAGES.duplicateMember.replace('{name}', 'Ann Lee')}`;

describe('team member trigger', () => {
  it('removes a new membership whose filter cannot run, notes its team and does nothing more for it', async () => {
    const rows = [row('old', 'T1', true, '2026-01-01T00:00:00.000Z'), row('m2', 'T2', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes } = makeApi(rows, false, ['m2']);

    await expect(
      makeRunMemberTrigger(api)({
        operation: 'created',
        events: [
          {
            recordId: 'm2',
            properties: { after: { crmTeamId: 'T2', salesUserId: 'U', active: true, name: null, assignmentDomain: '{"rules":[1]}', updatedBy: STAFF } },
          },
        ],
      }),
    ).rejects.toThrow('refused m2');

    expect(writes).toEqual(['check created m2 assignmentDomain', 'destroy m2', 'note T2 refused m2']);
  });

  it('removes a second active membership of the same salesperson in the same team, with a note on the team', async () => {
    const rows = [row('m1', 'T', true, '2026-01-01T00:00:00.000Z'), row('m2', 'T', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes, capacity } = makeApi(rows);

    await expect(
      makeRunMemberTrigger(api)({
        operation: 'created',
        events: [{ recordId: 'm2', properties: { after: { crmTeamId: 'T', salesUserId: 'U', active: true, name: null, updatedBy: STAFF } } }],
      }),
    ).rejects.toThrow('The new team members were removed.');

    expect(writes).toEqual(['destroy m2', duplicateNote('T')]);
    expect(capacity).toEqual([['T']]);
  });

  it('refuses a save that makes the same team and salesperson twice, removing both rows', async () => {
    const rows = [row('m1', 'T', true, '2026-01-01T00:00:00.000Z'), row('m2', 'T', true, '2026-01-01T00:00:00.000Z')];
    const { api, writes } = makeApi(rows);
    const created = (recordId: string) => ({
      recordId,
      properties: { after: { crmTeamId: 'T', salesUserId: 'U', active: true, name: null, updatedBy: STAFF } },
    });

    await expect(makeRunMemberTrigger(api)({ operation: 'created', events: [created('m1'), created('m2')] })).rejects.toThrow(
      'The new team members were removed.',
    );

    expect(writes.filter((write) => write.startsWith('destroy') || write.startsWith('archive') || write.startsWith('name'))).toEqual([
      'destroy m1,m2',
    ]);
  });

  it('removes every row of a save that makes one duplicate, the rows that were fine too', async () => {
    const rows = [
      row('m1', 'T', true, '2026-01-01T00:00:00.000Z'),
      row('m2', 'T', true, '2026-01-02T00:00:00.000Z'),
      row('other', 'T2', true, '2026-01-02T00:00:00.000Z', 'M'),
    ];
    const { api, writes } = makeApi(rows, true);
    const created = (recordId: string, teamId: string, userId: string) => ({
      recordId,
      properties: { after: { crmTeamId: teamId, salesUserId: userId, active: true, name: null, updatedBy: STAFF } },
    });

    await expect(
      makeRunMemberTrigger(api)({ operation: 'created', events: [created('m2', 'T', 'U'), created('other', 'T2', 'M')] }),
    ).rejects.toThrow('The new team members were removed.');

    expect(writes.filter((write) => !write.startsWith('note'))).toEqual(['destroy m2,other']);
  });

  it('archives only the old membership of a salesperson who joins a team in the same save as a newcomer', async () => {
    const rows = [
      row('st1-u', 'ST1', true, '2026-01-01T00:00:00.000Z'),
      row('nt-u', 'NEW', true, '2026-01-02T00:00:00.000Z'),
      row('nt-m', 'NEW', true, '2026-01-02T00:00:00.000Z', 'M'),
    ];
    const { api, writes } = makeApi(rows);
    const created = (recordId: string, userId: string) => ({
      recordId,
      properties: { after: { crmTeamId: 'NEW', salesUserId: userId, active: true, name: null, updatedBy: STAFF } },
    });

    await makeRunMemberTrigger(api)({ operation: 'created', events: [created('nt-u', 'U'), created('nt-m', 'M')] });

    expect(writes).toEqual(['archive st1-u', 'name nt-u Ann Lee', 'name nt-m Max Roe']);
  });

  it('archives the salesperson in their other team when they join a team, and names the new membership', async () => {
    const rows = [row('st1', 'T1', true, '2026-01-01T00:00:00.000Z'), row('nt', 'NEW', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes, capacity } = makeApi(rows);

    await makeRunMemberTrigger(api)({
      operation: 'created',
      events: [{ recordId: 'nt', properties: { after: { crmTeamId: 'NEW', salesUserId: 'U', active: true, name: null, updatedBy: STAFF } } }],
    });

    expect(writes).toEqual(['archive st1', 'name nt Ann Lee']);
    expect(capacity).toEqual([['NEW', 'T1']]);
  });

  it('keeps other teams when salespeople may be in several teams', async () => {
    const rows = [row('st1', 'T1', true, '2026-01-01T00:00:00.000Z'), row('nt', 'NEW', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes } = makeApi(rows, true);

    await makeRunMemberTrigger(api)({
      operation: 'created',
      events: [{ recordId: 'nt', properties: { after: { crmTeamId: 'NEW', salesUserId: 'U', active: true, name: 'Ann Lee', updatedBy: STAFF } } }],
    });

    expect(writes).toEqual([]);
  });

  it('switches an archived membership back off while the same pair is active', async () => {
    const rows = [row('old', 'T1', true, '2026-01-01T00:00:00.000Z'), row('new', 'T1', true, '2026-01-05T00:00:00.000Z')];
    const { api, writes } = makeApi(rows);

    await makeRunMemberTrigger(api)({
      operation: 'updated',
      events: [
        {
          recordId: 'new',
          properties: {
            before: { crmTeamId: 'T1', salesUserId: 'U', active: false },
            after: { crmTeamId: 'T1', salesUserId: 'U', active: true, updatedBy: STAFF },
            updatedFields: ['active'],
          },
        },
      ],
    });

    expect(writes).toEqual(['put back new {"active":false}', duplicateNote('T1')]);
  });

  it('archives the other team when an archived membership is switched back on', async () => {
    const rows = [row('new-st1', 'T1', true, '2026-01-03T00:00:00.000Z'), row('nt', 'NEW', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes } = makeApi(rows);

    await makeRunMemberTrigger(api)({
      operation: 'updated',
      events: [
        {
          recordId: 'nt',
          properties: {
            before: { crmTeamId: 'NEW', salesUserId: 'U', active: false },
            after: { crmTeamId: 'NEW', salesUserId: 'U', active: true, updatedBy: STAFF },
            updatedFields: ['active'],
          },
        },
      ],
    });

    expect(writes).toEqual(['archive new-st1']);
  });

  it('archives nothing when an active membership only moves to another team', async () => {
    const rows = [row('t1', 'T1', true, '2026-01-01T00:00:00.000Z'), row('m', 'T3', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes, capacity } = makeApi(rows);

    await makeRunMemberTrigger(api)({
      operation: 'updated',
      events: [
        {
          recordId: 'm',
          properties: {
            before: { crmTeamId: 'T2', salesUserId: 'U', active: true },
            after: { crmTeamId: 'T3', salesUserId: 'U', active: true, updatedBy: STAFF },
            updatedFields: ['crmTeam', 'crmTeamId'],
          },
        },
      ],
    });

    expect(writes).toEqual([]);
    expect(capacity).toEqual([['T2', 'T3']]);
  });

  it("checks nothing in the app's own archive and writes only the capacity", async () => {
    const rows = [row('st1', 'T1', false, '2026-01-01T00:00:00.000Z'), row('nt', 'NEW', true, '2026-01-02T00:00:00.000Z')];
    const { api, writes, capacity } = makeApi(rows);

    await makeRunMemberTrigger(api)({
      operation: 'updated',
      events: [
        {
          recordId: 'st1',
          properties: {
            before: { crmTeamId: 'T1', salesUserId: 'U', active: true },
            after: { crmTeamId: 'T1', salesUserId: 'U', active: false, updatedBy: APP },
            updatedFields: ['active'],
          },
        },
      ],
    });

    expect(writes).toEqual([]);
    expect(capacity).toEqual([['T1']]);
  });
});
