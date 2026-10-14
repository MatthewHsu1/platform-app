import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { fsmLocations, fsmOrders, fsmPersons, fsmTeams, fsmTemplates } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { refuseUsedDeletes } from 'src/fieldservice/refuse-used-deletes';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';

// A deleted team leaves the locations, workers and templates that name it.
const TEAM_DELETE_RULES = {
  references: [
    { of: fsmLocations, field: 'teamId' },
    { of: fsmPersons, field: 'teamId' },
    { of: fsmTemplates, field: 'teamId' },
  ],
  cascades: [],
  links: [],
};

// Every order needs a team, so a team that orders still name comes back with a note.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<object>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    const allowed = await refuseUsedDeletes({
      records: fsmTeams,
      events,
      users: fsmOrders,
      field: 'teamId',
      reason: FIELDSERVICE_MESSAGES.teamInUse,
    });

    await applyDeleteRules(fsmTeams, TEAM_DELETE_RULES, allowed);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmTeam,
  name: 'platform-fsm-team',
  description: 'Refuses deleting a field service team that orders use, and clears a deleted team from locations, workers and templates.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmTeam.*', batchMode: true },
});
