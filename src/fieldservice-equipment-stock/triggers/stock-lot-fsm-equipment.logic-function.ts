import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { recomputeEquipmentStockLocation } from 'src/fieldservice-equipment-stock/equipment/recompute-equipment-stock-location';
import { FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const LOCATION_FIELDS = ['location', 'locationId'];

// A serial's location follows its stock, so a lot whose location changed has moved: the equipment of that serial
// is where its stock now is.
const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'updated') {
    await recomputeEquipmentStockLocation({
      lotIds: events.filter((event) => updatedFieldsOf(event).some((field) => LOCATION_FIELDS.includes(field))).map((event) => event.recordId),
    });
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockLot,
  name: 'platform-stock-lot-fsm-equipment',
  description: 'Keeps the current inventory location of equipment right as its serial moves.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockLot.*', batchMode: true },
});
