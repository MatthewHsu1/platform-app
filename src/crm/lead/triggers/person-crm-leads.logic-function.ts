import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { makeRunPersonTrigger } from 'src/crm/lead/run-partner-triggers';
import { TWENTY_PARTNER_TRIGGER_API } from 'src/crm/lead/twenty-partner-api';
import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';

const runPersonTrigger = makeRunPersonTrigger(TWENTY_PARTNER_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await runPersonTrigger(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.person,
  name: 'platform-person-crm-leads',
  description: "Brings a contact's email and phone to its leads, and clears a deleted contact from its leads.",
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'person.*', batchMode: true },
});
