import { defineLogicFunction } from 'twenty-sdk/define';

import { discardExpiredLines } from 'src/product-expiry/actions/discard-expired-lines';
import {
  DISCARD_EXPIRED_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  DISCARD_EXPIRED_LINES_ROUTE_PATH,
} from 'src/product-expiry/actions/product-expiry-actions-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

export default defineLogicFunction({
  universalIdentifier: DISCARD_EXPIRED_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-picking-discard-expired-lines',
  description: 'Removes the lines of the transfers whose stock is past its removal date, before they are validated again.',
  timeoutSeconds: 120,
  handler: stockRouteHandler(discardExpiredLines),
  httpRouteTriggerSettings: { path: DISCARD_EXPIRED_LINES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
