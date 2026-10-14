import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { propagateOrderToMoves } from 'src/fieldservice-stock/move/propagate-order-to-moves';
import { readEvents } from 'src/shared/triggers/batch-events';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';

type RawEvent = ObjectRecordEvent<Record<string, unknown>>;

const PICKING_FIELDS = ['picking', 'pickingId'];

const sitsInTransfer = (event: RawEvent) => {
  const after = (event.properties as { after?: Record<string, unknown> }).after;

  return typeof after?.pickingId === 'string' && after.pickingId !== '';
};

// Only a move that was made in a transfer or moved into another one can need the order of that transfer.
const handler = async (payload: DatabaseEventBatchPayload<RawEvent>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'created' || operation === 'updated') {
    await propagateOrderToMoves({
      moveIds: events
        .filter((event) => sitsInTransfer(event) && (operation === 'created' || updatedFieldsOf(event).some((field) => PICKING_FIELDS.includes(field))))
        .map((event) => event.recordId),
    });
  }
  return {};
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockMove,
  name: 'platform-stock-move-fsm-order',
  description: 'Gives a stock move the service order of the transfer it sits in.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMove.*', batchMode: true },
});
