import { defineLogicFunction } from 'twenty-sdk/define';

import { clearCounts, readQuantIdsForManager, readQuantIdsToChange } from 'src/stock/quant/actions/count-actions';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import {
  CLEAR_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: CLEAR_COUNTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-clear-counts',
  description: 'Clears the count and the assigned user of the selected stock rows.',
  timeoutSeconds: 60,
  // A stock user clears the count of the one row they have open; clearing a selection is the
  // inventory manager's.
  handler: stockRouteHandler(async (body) =>
    clearCounts(
      body.row === true && readIds(body, 'quantIds').length === 1
        ? await readQuantIdsToChange(body)
        : await readQuantIdsForManager(body),
    ),
  ),
  httpRouteTriggerSettings: { path: CLEAR_COUNTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
