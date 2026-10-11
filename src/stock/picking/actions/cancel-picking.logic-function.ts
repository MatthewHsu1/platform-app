import { defineLogicFunction } from 'twenty-sdk/define';

import { cancelPickings } from 'src/stock/picking/actions/cancel-pickings';
import { readRequestedPickingIds } from 'src/stock/picking/actions/read-requested-picking-ids';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  CANCEL_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CANCEL_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readRequestedPickingIds(body);

  await cancelPickings(pickingIds);

  return { pickingIds };
});

export default defineLogicFunction({
  universalIdentifier: CANCEL_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-cancel-picking',
  description: 'Cancels transfers: their moves are unreserved and cancelled, and the transfers locked.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: CANCEL_PICKING_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
