import { defineLogicFunction } from 'twenty-sdk/define';

import { requireReadableQuantIds, setCountsToZero } from 'src/stock/quant/actions/count-actions';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  SET_COUNTS_TO_ZERO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_TO_ZERO_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: SET_COUNTS_TO_ZERO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-set-counts-to-zero',
  description: 'Counts 0 on the selected stock rows and assigns them to the clicking user.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => setCountsToZero(await requireReadableQuantIds(body))),
  httpRouteTriggerSettings: { path: SET_COUNTS_TO_ZERO_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
