import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyEquipmentStock } from 'src/fieldservice-equipment-stock/equipment/apply-equipment-stock';
import { applyEquipmentSaves } from 'src/fieldservice/equipment/apply-equipment-saves';
import { EQUIPMENT_DELETE_RULES } from 'src/fieldservice/equipment/equipment-delete-rules';
import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { fsmEquipments } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { recomputeLocationCounts } from 'src/fieldservice/location/recompute-location-counts';
import { refuseDuplicateNames } from 'src/fieldservice/refuse-duplicate-names';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();
  const warnings: string[] = [];

  if (operation === 'created' || operation === 'updated') {
    await errors.run('names', () =>
      refuseDuplicateNames({ records: fsmEquipments, operation, events, reason: FIELDSERVICE_MESSAGES.equipmentNameTaken }),
    );
    await errors.run('product and serial', () => applyEquipmentStock(operation, events));
    warnings.push(...(await applyEquipmentSaves(operation, events, new Date().toISOString().slice(0, 10))));
  }
  if (operation === 'deleted') {
    await errors.run('delete rules', () => applyDeleteRules(fsmEquipments, EQUIPMENT_DELETE_RULES, events.map((event) => event.recordId)));
  }
  if (operation !== 'updated' || events.some((event) => updatedFieldsOf(event).includes('locationId'))) {
    await errors.run('location counts', recomputeLocationCounts);
  }
  errors.throwIfAny();

  // A refused new equipment is removed; the function's log shows why.
  return { warnings };
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmEquipment,
  name: 'platform-fsm-equipment',
  description:
    'Keeps the service area, the warranty and the inventory location of equipment right, refuses a duplicate name, equipment under itself and a warranty ending before it starts, and keeps the location counts.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmEquipment.*', batchMode: true },
});
