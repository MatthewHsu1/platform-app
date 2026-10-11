import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { CRM_LEAD_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { TWENTY_LEAD_TRIGGER_API } from 'src/crm/lead/twenty-lead-api';
import { readEvents } from 'src/shared/triggers/batch-events';

const runLeadTrigger = makeRunLeadTrigger(TWENTY_LEAD_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);

  await runLeadTrigger({ operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: CRM_LEAD_TRIGGER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-crm-lead',
  description:
    "Keeps each lead's stage, dates, probability, status, money and quality values right after every save, and undoes a save that leaves a won lead below 100 %.",
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'crmLead.*', batchMode: true },
});
