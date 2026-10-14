import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { createEquipmentForMoves } from 'src/fieldservice-equipment-stock/move/create-equipment-for-moves';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { MOVE_STATE } from 'src/stock/stock-options.constant';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const isDone = (event: RawEvent) => (event.properties as { after?: Record<string, unknown> }).after?.state === MOVE_STATE.DONE;

// Only a move that was made done, or turned done, can make equipment. The app's own writes count: Validate marks
// the moves done.
const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'created' || operation === 'updated') {
    await createEquipmentForMoves(
      events.filter((event) => isDone(event) && (operation === 'created' || updatedFieldsOf(event).includes('state'))).map((event) => event.recordId),
    );
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockMove,
  name: 'platform-stock-move-fsm-equipment',
  description: 'Makes one piece of equipment for each serial a done move carries, when its product and its operation type are set to make equipment.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMove.*', batchMode: true },
});
