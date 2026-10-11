import { defineLogicFunction } from 'twenty-sdk/define';

import { clearCounts, requireReadableQuantIds } from 'src/stock/quant/actions/count-actions';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  CLEAR_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: CLEAR_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-clear-counts',
  description: 'Clears the count and the assigned user of the selected stock rows.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => clearCounts(await requireReadableQuantIds(body))),
  httpRouteTriggerSettings: { path: CLEAR_COUNTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
