import { defineLogicFunction } from 'twenty-sdk/define';

import { generateLotLines } from 'src/stock/lot/actions/generate-lot-lines';
import {
  GENERATE_LOT_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  GENERATE_LOT_LINES_ROUTE_PATH,
} from 'src/stock/lot/actions/lot-actions-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

export default defineLogicFunction({
  universalIdentifier: GENERATE_LOT_LINES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-move-generate-lot-lines',
  description: 'Makes the move lines of a tracked move from generated or pasted lot/serial numbers.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(generateLotLines),
  httpRouteTriggerSettings: { path: GENERATE_LOT_LINES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
