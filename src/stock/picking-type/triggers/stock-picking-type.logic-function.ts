import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import {
  handlePickingTypeCodeChanged,
  handlePickingTypeCreated,
} from 'src/stock/picking-type/rules/picking-type-defaults';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { handlePickingTypeDeletes } from 'src/stock/picking-type/rules/picking-type-delete';
import { handlePickingTypeFullName } from 'src/stock/picking-type/rules/picking-type-full-name';
import { handlePickingTypeReservation } from 'src/stock/picking-type/rules/picking-type-reservation';
import { handlePickingTypeSequence } from 'src/stock/picking-type/rules/picking-type-sequence';
import { STOCK_PICKING_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<PickingTypeEventRecord>>) => {
  const { operation, events } = readEvents<PickingTypeEventRecord>(payload);
  const errors = errorCollector();

  await handlePickingTypeCreated(events, operation, errors);
  await handlePickingTypeFullName(events, operation, errors);
  await handlePickingTypeCodeChanged(events, operation, errors);
  await handlePickingTypeSequence(events, operation, errors);
  await handlePickingTypeReservation(events, operation, errors);
  await handlePickingTypeDeletes(events, operation, errors);

  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-picking-type',
  description:
    'Gives a new operation type its warehouse, sequence, default locations and lot and label flags, keeps its full name (warehouse: type), follows a changed type of operation and sequence prefix, dates or undates the reservations of its open moves, puts back deleting a type that transfers use, and removes the wave links of a deleted type.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPickingType.*', batchMode: true },
});
