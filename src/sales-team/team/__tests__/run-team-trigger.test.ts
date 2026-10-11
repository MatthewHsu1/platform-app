import { describe, expect, it } from 'vitest';

import { makeRunTeamTrigger } from 'src/sales-team/team/run-team-trigger';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';

const makeApi = ({ deleted = [], linked = [] }: { deleted?: { id: string; seedKey: string | null }[]; linked?: string[] }) => {
  const calls: string[] = [];
  const restored: { id: string; reason: string }[] = [];
  const colored: string[] = [];

  const api = {
    pickColor: () => 'red',
    setColor: async (teamId: string) => {
      colored.push(teamId);
    },
    stillDeletedTeams: async (teamIds: string[]) => deleted.filter((team) => teamIds.includes(team.id)),
    teamIdsOnStages: async (teamIds: string[]) => new Set(linked.filter((id) => teamIds.includes(id))),
    restoreTeam: async (id: string, reason: string) => {
      restored.push({ id, reason });
    },
    foldTeamScoring: async (teamIds: string[]) => {
      calls.push(`fold ${teamIds.join(',')}`);
    },
    deleteMembersOf: async (teamIds: string[]) => {
      calls.push(`members ${teamIds.join(',')}`);
    },
    clearTeamOnLeads: async (teamIds: string[]) => {
      calls.push(`leads ${teamIds.join(',')}`);
    },
    checkAssignmentFilters: async () => undefined,
    memberLocale: async () => 'en',
    translate: (_locale: string | null, message: string) => message,
  };

  return { api, calls, restored, colored };
};

const deleteEvent = (recordId: string) => ({ recordId, workspaceMemberId: 'admin', properties: {} });

describe('team trigger', () => {
  it('puts back a deleted default team and a team a stage is limited to, and goes no further for them', async () => {
    const { api, calls, restored } = makeApi({
      deleted: [
        { id: 'web', seedKey: 'sales_team.salesteam_website_sales' },
        { id: 'T', seedKey: null },
      ],
      linked: ['T'],
    });

    await makeRunTeamTrigger(api)({ operation: 'deleted', events: [deleteEvent('web'), deleteEvent('T')] });

    expect(restored).toEqual([
      { id: 'web', reason: TEAM_MESSAGES.defaultTeam },
      { id: 'T', reason: TEAM_MESSAGES.usedByStage },
    ]);
    expect(calls).toEqual([]);
  });

  it('folds the scoring rows of a deleted team before it removes its members and takes it off its leads', async () => {
    const { api, calls } = makeApi({ deleted: [{ id: 'U', seedKey: null }] });

    await makeRunTeamTrigger(api)({ operation: 'deleted', events: [deleteEvent('U')] });

    expect(calls).toEqual(['fold U', 'members U', 'leads U']);
  });

  it('does nothing for a delete another run has already put back', async () => {
    const { api, calls, restored } = makeApi({ deleted: [] });

    await makeRunTeamTrigger(api)({ operation: 'deleted', events: [deleteEvent('web')] });

    expect([...calls, ...restored]).toEqual([]);
  });

  it('gives a new team without a colour a colour and keeps a chosen one', async () => {
    const { api, colored } = makeApi({});

    await makeRunTeamTrigger(api)({
      operation: 'created',
      events: [
        { recordId: 'plain', properties: { after: { color: null } } },
        { recordId: 'chosen', properties: { after: { color: 'blue' } } },
      ],
    });

    expect(colored).toEqual(['plain']);
  });
});
