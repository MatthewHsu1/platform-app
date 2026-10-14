import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';
import { undoUnmetStageMoves } from 'src/fieldservice-stage-validation/undo-unmet-stage-moves';
import { readEvents } from 'src/shared/triggers/batch-events';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'updated') {
    await undoUnmetStageMoves(events);
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-fsm-order-stage-validation',
  description: 'Undoes a move of a service order into a stage while a field the stage needs is still empty.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmOrder.updated', batchMode: true },
});
