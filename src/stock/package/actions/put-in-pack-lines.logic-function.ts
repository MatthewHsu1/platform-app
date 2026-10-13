import { defineLogicFunction } from 'twenty-sdk/define';

import {
  PUT_IN_PACK_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  PUT_IN_PACK_LINES_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { putLinesInPack } from 'src/stock/package/put-in-pack';
import { stockRouteHandler } from 'src/stock/stock-route';

export default defineLogicFunction({
  universalIdentifier: PUT_IN_PACK_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-picking-put-in-pack',
  description: "Packs a transfer's lines (or the selected lines) into a package, asking for a destination or a package when needed.",
  timeoutSeconds: 120,
  handler: stockRouteHandler(putLinesInPack),
  httpRouteTriggerSettings: { path: PUT_IN_PACK_LINES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
