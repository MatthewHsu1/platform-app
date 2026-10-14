import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { fsmTemplates } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { cascadeActivities } from 'src/fieldservice-activity/triggers/cascade-activities';
import { readEvents } from 'src/shared/triggers/batch-events';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  await cascadeActivities({ parents: fsmTemplates, field: 'fsmTemplateId', operation, events });

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmTemplate,
  name: 'platform-fsm-template-activity',
  description: 'Deletes and restores the checklist of a service order template with it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmTemplate.*', batchMode: true },
});
