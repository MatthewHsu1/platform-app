import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';
import { undoUnmetStageMoves } from 'src/fieldservice-stage-validation/undo-unmet-stage-moves';
import { readEvents } from 'src/shared/triggers/batch-events';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'created' || operation === 'updated') {
    await undoUnmetStageMoves(operation, events);
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.order,
  name: 'platform-fsm-order-stage-validation',
  description:
    'Fallback of the stage validation rules: undoes a move of a service order into a stage while a field the stage needs is still empty (every field when validation rules are off, only the equipment and worker lists when they are on).',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmOrder.*', batchMode: true },
});
