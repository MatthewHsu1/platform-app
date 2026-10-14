import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { fsmEquipmentFsmOrderRels } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { fillOrderDescriptions } from 'src/fieldservice/order/fill-order-descriptions';
import { readEvents } from 'src/shared/triggers/batch-events';

type LinkRecord = { orderId?: string | null };

// A removed link is destroyed so the same link can be made again; a new one gives an order without a description
// the notes of its equipment.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LinkRecord>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    await fsmEquipmentFsmOrderRels.destroySoftDeleted(events.map((event) => event.recordId));
  }
  if (operation === 'created') {
    await fillOrderDescriptions(
      events.flatMap((event) => {
        const after = 'after' in event.properties ? event.properties.after : undefined;

        return typeof after?.orderId === 'string' ? [after.orderId] : [];
      }),
    );
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmEquipmentFsmOrderRel,
  name: 'platform-fsm-equipment-fsm-order-rel',
  description: 'Removes a deleted order equipment link for good, and gives an order without a description the notes of its equipment.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmEquipmentFsmOrderRel.*', batchMode: true },
});
