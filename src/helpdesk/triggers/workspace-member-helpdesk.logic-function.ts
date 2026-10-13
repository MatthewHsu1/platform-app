import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { recomputeTeamCounts } from 'src/helpdesk/recompute-team-counts';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';

const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');

// A staff member removed from the workspace is destroyed, and the database empties them from the cases
// they held, so no case event arrives: every team counts its cases without an assignee again.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation } = readEvents(payload);

  if (operation === 'destroyed') {
    const every = await teams.find<{ id: string }>({}, 'id');

    await recomputeTeamCounts(every.map((team) => team.id));
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.workspaceMember,
  name: 'platform-workspace-member-helpdesk-tickets',
  description: 'Counts the open work cases of every team again after a staff member leaves the workspace.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'workspaceMember.*', batchMode: true },
});
