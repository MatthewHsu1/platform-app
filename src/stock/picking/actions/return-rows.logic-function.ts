import { defineLogicFunction } from 'twenty-sdk/define';

import { readRequestedPickingIds } from 'src/stock/picking/actions/read-requested-picking-ids';
import { readReturnRows } from 'src/stock/picking/actions/return-picking';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  RETURN_ROWS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  RETURN_ROWS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => readReturnRows(await readRequestedPickingIds(body)));

export default defineLogicFunction({
  universalIdentifier: RETURN_ROWS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-return-rows',
  description: 'Lists the products of a done transfer that can be returned.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: RETURN_ROWS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
