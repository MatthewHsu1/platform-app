import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { checkAssignmentFilters } from 'src/sales-team/check-assignment-filters';
import { readUserNames } from 'src/sales-team/member/read-user-names';
import { makeRunMemberTrigger } from 'src/sales-team/member/run-member-trigger';
import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { recomputeTeamCapacity } from 'src/sales-team/team/recompute-team-capacity';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readEvents } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';

const MEMBERS = { objectSingular: 'crmTeamMember', objectPlural: 'crmTeamMembers' } as const;
const members = records(MEMBERS.objectSingular, MEMBERS.objectPlural);

const runMemberTrigger = makeRunMemberTrigger({
  // Rows in the trash do not count.
  membershipsOfUsers: async (userIds) =>
    (
      await members.find<{ id: string; crmTeamId: string | null; userId: string | null; active: boolean | null; createdAt: string }>(
        { userId: { in: userIds } },
        'id crmTeamId userId active createdAt',
      )
    ).map((row) => ({ id: row.id, teamId: row.crmTeamId, userId: row.userId, active: row.active === true, createdAt: row.createdAt })),
  userNames: readUserNames,
  destroyMembers: async (memberIds) => {
    await members.destroyMany(memberIds);
  },
  softDeleteMember: async (memberId) => {
    await members.softDeleteMany([memberId]);
  },
  // The note goes on the team, not on the member row.
  putBackMember: (memberId, data) => members.update(memberId, data),
  noteOnTeam: (teamId, reason) => addNote({ objectSingular: 'crmTeam', recordId: teamId, title: 'Change undone', body: reason }),
  archiveMembers: (memberIds) => members.updateMany(memberIds, { active: false }),
  renameMember: (memberId, name) => members.update(memberId, { name }),
  readSettings: readCrmSettings,
  recomputeCapacity: recomputeTeamCapacity,
  checkAssignmentFilters: (changes) => checkAssignmentFilters({ objectSingular: 'crmTeamMember', changes }),
  memberLocale: readMemberLocale,
  translate,
});

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runMemberTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.crmTeamMember,
  name: 'platform-crm-team-member',
  description:
    'Keeps one active membership per team and salesperson, one team per salesperson unless allowed, member names and team capacity.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmTeamMember.*', batchMode: true },
});
