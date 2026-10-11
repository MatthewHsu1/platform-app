import { defineLogicFunction } from 'twenty-sdk/define';

import { readQuantIdsToChange, setCounts } from 'src/stock/quant/actions/count-actions';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  SET_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: SET_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-set-counts',
  description: 'Copies the stock into the count of the selected rows, asking first when some already have a count.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => setCounts(await readQuantIdsToChange(body), body.onlyUnset === true)),
  httpRouteTriggerSettings: { path: SET_COUNTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
