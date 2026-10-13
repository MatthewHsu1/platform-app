import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { destroyLinksOf, stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { stockMoves, stockRouteMoves } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<{ id: string }>>) => {
  const { operation, events } = readEvents(payload);

  if (operation === 'deleted') {
    const removed = await stillDeletedIds(
      stockMoves,
      events.map((event) => event.recordId),
    );

    await destroyLinksOf(stockRouteMoves, 'stockMoveId', removed);
  }

  return {};
};

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockMove,
  name: 'platform-stock-move-routing',
  description: "Removes a deleted move's route links for good.",
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'stockMove.deleted', batchMode: true },
});
