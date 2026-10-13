import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { handleLocationDeletes } from 'src/stock/location/rules/location-delete';
import { handleLocationRecompute } from 'src/stock/location/rules/location-recompute';
import { handleLocationRefusals } from 'src/stock/location/rules/location-refusals';
import { type LocationEventRecord } from 'src/stock/location/types/location-event-record.type';
import { STOCK_LOCATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<LocationEventRecord>>) => {
  const { operation, events } = readEvents<LocationEventRecord>(payload);
  const errors = errorCollector();

  await handleLocationRefusals(events, operation, errors);
  await handleLocationRecompute(events, operation, errors);
  await handleLocationDeletes(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_LOCATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-location',
  description:
    'Keeps location names, paths, warehouses and count dates right, archives and deletes a location with the ones under it, and puts back loops, usage changes of locations with stock, a second replenish location, archiving used locations and deleting used ones.',
  timeoutSeconds: 300,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockLocation.*', batchMode: true },
});
