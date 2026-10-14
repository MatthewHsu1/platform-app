import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { cascadeActivities } from 'src/fieldservice-activity/triggers/cascade-activities';
import { copyTemplateActivities } from 'src/fieldservice-activity/triggers/copy-template-activities';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'created' || operation === 'updated') {
    await errors.run('checklist copy', () => copyTemplateActivities(operation, events));
  }
  await errors.run('checklist delete and restore', () => cascadeActivities({ parents: fsmOrders, field: 'fsmOrderId', operation, events }));
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmOrder,
  name: 'platform-fsm-order-activity',
  description: 'Copies the checklist of a template onto an order that picks it, and deletes and restores the checklist of an order with it.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmOrder.*', batchMode: true },
});
