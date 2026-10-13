import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { pickRandomColor } from 'src/crm/color-index.constant';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { checkAssignmentFilters } from 'src/sales-team/check-assignment-filters';
import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { foldTeamScoring } from 'src/sales-team/team/fold-team-scoring';
import { makeRunTeamTrigger } from 'src/sales-team/team/run-team-trigger';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readEvents } from 'src/shared/triggers/batch-events';
import { cascadeDelete } from 'src/shared/triggers/cascade-delete';
import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';

const TEAMS = { objectSingular: 'crmTeam', objectPlural: 'crmTeams' } as const;
const teams = records(TEAMS.objectSingular, TEAMS.objectPlural);
const members = records('crmTeamMember', 'crmTeamMembers');
const stageTeams = records('crmStageTeam', 'crmStageTeams');
const leads = records('crmLead', 'crmLeads');

const runTeamTrigger = makeRunTeamTrigger({
  pickColor: () => pickRandomColor(),
  setColor: (teamId, color) => teams.update(teamId, { color }),
  stillDeletedTeams: async (teamIds) =>
    (
      await teams.findIncludingDeleted<{ id: string; seedKey: string | null; deletedAt: string | null }>(
        { id: { in: teamIds } },
        'id seedKey deletedAt',
      )
    ).filter((team) => team.deletedAt !== null),
  teamIdsOnStages: async (teamIds) =>
    new Set(
      (await stageTeams.find<{ teamId: string | null }>({ teamId: { in: teamIds } }, 'teamId')).flatMap(({ teamId }) =>
        teamId === null ? [] : [teamId],
      ),
    ),
  restoreTeam: (teamId, reason) => restoreIfStillDeleted({ ...TEAMS, recordId: teamId, reason }),
  foldTeamScoring,
  deleteMembersOf: (teamIds) => cascadeDelete({ parents: teams, parentIds: teamIds, children: [{ of: members, field: 'crmTeamId' }] }),
  // An app write through the lead rules, so the lead's other values follow the empty team.
  clearTeamOnLeads: async (teamIds) => {
    const inTeams = await leads.find<{ id: string }>({ teamId: { in: teamIds } }, 'id');

    if (inTeams.length > 0) {
      await writeLeadsAsApplication(inTeams.map(({ id }) => ({ leadId: id, data: { teamId: null } })));
    }
  },
  // Trashed rows too: a trashed stage link still blocks the team's removal.
  destroyStageLinksOf: async (teamIds) => {
    await stageTeams.destroyMany((await stageTeams.findIncludingDeleted<{ id: string }>({ teamId: { in: teamIds } }, 'id')).map(({ id }) => id));
  },
  destroyMembersOf: async (teamIds) => {
    await members.destroyMany((await members.findIncludingDeleted<{ id: string }>({ crmTeamId: { in: teamIds } }, 'id')).map(({ id }) => id));
  },
  destroyTeams: async (teamIds) => {
    await teams.destroyMany(teamIds);
  },
  checkAssignmentFilters: (changes) => checkAssignmentFilters({ objectSingular: 'crmTeam', changes }),
  memberLocale: readMemberLocale,
  translate: (locale, message) => translate(locale, message),
});

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runTeamTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.crmTeam,
  name: 'platform-crm-team',
  description:
    'Gives a new team a colour, keeps default and stage-limited teams, clears deleted teams from members and leads, and refuses an assignment filter that cannot run.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmTeam.*', batchMode: true },
});
