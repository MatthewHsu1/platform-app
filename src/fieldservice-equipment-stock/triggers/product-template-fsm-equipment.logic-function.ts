import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { copyProductWarranty } from 'src/fieldservice-equipment-stock/equipment/copy-product-warranty';
import { FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const WARRANTY_FIELDS = ['warranty', 'warrantyType'];

// Equipment shows the warranty of its product, so a product whose warranty changed gives it to its equipment.
const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'updated') {
    await copyProductWarranty({
      templateIds: events.filter((event) => updatedFieldsOf(event).some((field) => WARRANTY_FIELDS.includes(field))).map((event) => event.recordId),
    });
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productTemplate,
  name: 'platform-product-template-fsm-equipment',
  description: 'Gives the equipment of a product the new warranty length and unit when the product changes them.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplate.*', batchMode: true },
});
