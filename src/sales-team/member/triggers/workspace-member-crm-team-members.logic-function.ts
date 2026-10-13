import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readUserNames } from 'src/sales-team/member/read-user-names';
import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { recomputeTeamCapacity } from 'src/sales-team/team/recompute-team-capacity';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

const members = records('crmTeamMember', 'crmTeamMembers');

// A renamed salesperson renames their team member rows. A salesperson removed
// from the workspace takes their member rows with them (the database removes
// them), so every team's capacity is summed again.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'updated') {
    const userIds = events.filter((event) => updatedFieldsOf(event).includes('name')).map((event) => event.recordId);

    if (userIds.length > 0) {
      await errors.run('names', async () => {
        const names = await readUserNames(userIds);
        const rows = await members.find<{ id: string; salesUserId: string | null; name: string | null }>({ salesUserId: { in: userIds } }, 'id salesUserId name');

        for (const row of rows) {
          const name = names.get(row.salesUserId ?? '') ?? null;

          if (name !== row.name) {
            await members.update(row.id, { name });
          }
        }
      });
    }
  }

  if (operation === 'destroyed') {
    await errors.run('capacity', () => recomputeTeamCapacity());
  }

  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.workspaceMember,
  name: 'platform-workspace-member-crm-team-members',
  description: 'Keeps team member names on a salesperson rename and team capacity after a salesperson leaves the workspace.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'workspaceMember.*', batchMode: true },
});
