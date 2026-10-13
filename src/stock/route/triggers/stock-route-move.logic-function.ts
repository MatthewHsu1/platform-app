import { defineLogicFunction } from 'twenty-sdk/define';

import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { stockRouteMoves } from 'src/stock/routing-records';
import { ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.stockRouteMove,
  name: 'platform-stock-route-move',
  description: 'Removes a move route link for good once it is deleted.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(stockRouteMoves),
  databaseEventTriggerSettings: { eventName: 'stockRouteMove.*', batchMode: true },
});
