import { describe, expect, it } from 'vitest';

import { applyCaseCreates, applyCaseUpdates } from 'src/helpdesk/ticket/apply-case-events';
import { type CaseApi } from 'src/helpdesk/ticket/types/case-api.type';
import { type CaseEvent } from 'src/helpdesk/ticket/types/case-event.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { NOW, caseRow, context } from 'src/helpdesk/utils/__tests__/case-fixtures';

const fakeApi = (rows: CaseRow[], numbers: (string | null)[] = ['HT00001', 'HT00002']) => {
  const store = new Map(rows.map((row) => [row.id, { ...row }]));
  const writes: { id: string; data: Partial<CaseRow> }[] = [];
  const api: CaseApi = {
    readCases: async (ids) => ids.flatMap((id) => (store.has(id) ? [{ ...store.get(id)! }] : [])),
    loadContext: async () => context(),
    takeNumber: async () => numbers.shift() ?? null,
    writeCase: async (id, data) => {
      writes.push({ id, data });
      store.set(id, { ...store.get(id)!, ...data, updatedBy: { source: 'APPLICATION', workspaceMemberId: null } });
    },
  };

  return { api, store, writes };
};

const event = (before: CaseRow | null, after: CaseRow, updatedFields: string[], workspaceMemberId: string | null = 'userOwn'): CaseEvent => ({
  recordId: after.id,
  before,
  after,
  updatedFields,
  workspaceMemberId,
});

describe('case creates', () => {
  it('numbers, assigns, places and stamps a case a staff member creates', async () => {
    const created = caseRow();
    const { api, store } = fakeApi([created]);

    const result = await applyCaseCreates([event(null, created, [])], api, NOW);

    expect(store.get('case1')).toMatchObject({
      number: 'HT00001',
      assignedUserId: 'userOwn',
      teamId: 'teamA',
      stageId: 'new',
      assignedDate: NOW,
      lastStageUpdate: NOW,
      unattended: true,
    });
    expect(result.created).toEqual(['case1']);
    expect(result.teamsToCount).toEqual(['teamA']);
  });

  it('marks the number as missing when no number sequence is active', async () => {
    const created = caseRow({ number: '' });
    const { api, store } = fakeApi([created], [null]);

    await applyCaseCreates([event(null, created, [], null)], api, NOW);

    expect(store.get('case1')?.number).toBe('/');
  });

  it('skips a case deleted before the trigger ran', async () => {
    const { api, writes } = fakeApi([]);

    await applyCaseCreates([event(null, caseRow(), [])], api, NOW);

    expect(writes).toEqual([]);
  });
});

describe('case updates', () => {
  const placed = caseRow({
    number: 'HT00001',
    teamId: 'teamA',
    assignedUserId: 'userOwn',
    stageId: 'new',
    unattended: true,
    lastStageUpdate: '2026-10-01T00:00:00.000Z',
  });

  it('runs the save rules for a staff save and reports the stage save', async () => {
    const after = { ...placed, stageId: 'done' };
    const { api, store } = fakeApi([after]);

    const result = await applyCaseUpdates([event(placed, after, ['stage', 'stageId'])], api, NOW);

    expect(store.get('case1')).toMatchObject({ closedDate: NOW, lastStageUpdate: NOW, unattended: false });
    expect(result.stageSaved).toEqual([{ caseId: 'case1', stageId: 'done' }]);
    expect(result.teamsToCount).toEqual(['teamA']);
  });

  it('writes nothing for its own echo', async () => {
    const echo = { ...placed, updatedBy: { source: 'APPLICATION', workspaceMemberId: null } };
    const { api, writes } = fakeApi([echo]);

    await applyCaseUpdates([event(placed, echo, ['unattended'])], api, NOW);

    expect(writes).toEqual([]);
  });

  it('applies two saves of one case in one batch in order, the later save winning', async () => {
    const teamChanged = { ...placed, teamId: 'teamB' };
    const assigneeSaved = { ...teamChanged, assignedUserId: 'userTeam' };
    const { api, store } = fakeApi([assigneeSaved]);

    await applyCaseUpdates(
      [event(placed, teamChanged, ['team', 'teamId']), event(teamChanged, assigneeSaved, ['assignedUser', 'assignedUserId'])],
      api,
      NOW,
    );

    expect(store.get('case1')).toMatchObject({ teamId: 'teamB', assignedUserId: 'userTeam', assignedDate: NOW });
  });

  it('leaves a field to the next batch when a newer save already changed it', async () => {
    const teamChanged = { ...placed, teamId: 'teamB' };
    const newer = { ...teamChanged, assignedUserId: 'user', updatedBy: { source: 'MANUAL', workspaceMemberId: 'user' } };
    const { api, store } = fakeApi([newer]);

    await applyCaseUpdates([event(placed, teamChanged, ['team', 'teamId'])], api, NOW);

    expect(store.get('case1')?.assignedUserId).toBe('user');
  });

  it('counts both the old and the new team when a case changes team', async () => {
    const after = { ...placed, teamId: 'teamB', assignedUserId: null };
    const { api } = fakeApi([after]);

    const result = await applyCaseUpdates([event(placed, after, ['team', 'teamId', 'assignedUser', 'assignedUserId'])], api, NOW);

    expect(result.teamsToCount.sort()).toEqual(['teamA', 'teamB']);
  });

  it('counts the team when only the priority changes', async () => {
    const after = { ...placed, priority: 'VERY_HIGH' };
    const { api } = fakeApi([after]);

    expect((await applyCaseUpdates([event(placed, after, ['priority'])], api, NOW)).teamsToCount).toEqual(['teamA']);
  });
});
