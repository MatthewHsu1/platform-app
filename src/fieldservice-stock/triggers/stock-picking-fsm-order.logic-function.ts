import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { propagateOrderToMoves } from 'src/fieldservice-stock/move/propagate-order-to-moves';
import { recomputeOrderPickingCounts } from 'src/fieldservice-stock/picking/recompute-order-picking-counts';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { stockPickings } from 'src/stock/stock-records';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

// The order and operation type of a transfer decide its order's counts.
const COUNT_FIELDS = ['fsmOrder', 'fsmOrderId', 'pickingType', 'pickingTypeId', 'pickingTypeCode'];
const ORDER_FIELDS = ['fsmOrder', 'fsmOrderId'];

const orderIdOf = (event: RawEvent, side: 'before' | 'after') => {
  const value = (event.properties as { before?: Record<string, unknown>; after?: Record<string, unknown> })[side]?.fsmOrderId;

  return typeof value === 'string' && value !== '' ? value : null;
};

const touches = (event: RawEvent, fields: string[]) => updatedFieldsOf(event).some((field) => fields.includes(field));

// The orders whose counts a batch can change: a new transfer's, a changed transfer's old and new order, and for a
// delete, restore or destroy the order the transfer names in the table.
const ordersOf = async (operation: string, events: RawEvent[]) => {
  if (operation === 'created') {
    return events.map((event) => orderIdOf(event, 'after'));
  }
  if (operation === 'updated') {
    return events.filter((event) => touches(event, COUNT_FIELDS)).flatMap((event) => [orderIdOf(event, 'before'), orderIdOf(event, 'after')]);
  }
  const rows = await stockPickings.findIncludingDeleted<{ fsmOrderId: string | null }>(
    { id: { in: events.map((event) => event.recordId) } },
    'fsmOrderId',
  );

  return [...rows.map((row) => row.fsmOrderId), ...events.map((event) => orderIdOf(event, 'before'))];
};

const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);
  const errors = errorCollector();

  await errors.run('delivery and return counts', async () => recomputeOrderPickingCounts(await ordersOf(operation, events)));
  await errors.run('moves of the order', () =>
    propagateOrderToMoves({
      pickingIds: events
        .filter((event) => (operation === 'created' && orderIdOf(event, 'after') !== null) || (operation === 'updated' && touches(event, ORDER_FIELDS)))
        .map((event) => event.recordId),
    }),
  );
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockPicking,
  name: 'platform-stock-picking-fsm-order',
  description: 'Keeps the delivery and return counts of a service order right as transfers come and go, and gives the moves of a transfer the order of the transfer.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockPicking.*', batchMode: true },
});
