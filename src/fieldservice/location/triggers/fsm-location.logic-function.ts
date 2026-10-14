import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_MESSAGES } from 'src/fieldservice/fieldservice-messages.constant';
import { fsmLocations, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { applyLocationSaves } from 'src/fieldservice/location/apply-location-saves';
import { LOCATION_DELETE_RULES } from 'src/fieldservice/location/location-delete-rules';
import { recomputeLocationCounts } from 'src/fieldservice/location/recompute-location-counts';
import { refuseUsedDeletes } from 'src/fieldservice/refuse-used-deletes';
import 'src/fieldservice-crm/location-delete-entries';
import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    const allowed = await refuseUsedDeletes({
      records: fsmLocations,
      events,
      users: fsmOrders,
      field: 'locationId',
      reason: FIELDSERVICE_MESSAGES.locationInUse,
    });

    await errors.run('delete rules', () => applyDeleteRules(fsmLocations, LOCATION_DELETE_RULES, allowed));
  }
  if (operation === 'created' || operation === 'updated' || operation === 'restored' || operation === 'deleted') {
    await errors.run('names and areas', () => applyLocationSaves(operation, operation === 'deleted' ? [] : events));
  }
  await errors.run('counts', recomputeLocationCounts);
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmLocation,
  name: 'platform-fsm-location',
  description:
    'Keeps the full name, full directions, owner, service area and counts of service locations right, refuses a location under itself, and refuses deleting a location that orders use.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'fsmLocation.*', batchMode: true },
});
