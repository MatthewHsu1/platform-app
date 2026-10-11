import { defineLogicFunction } from 'twenty-sdk/define';

import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { splitPicking } from 'src/stock/picking/actions/split-picking';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  SPLIT_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SPLIT_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => splitPicking(await readPickingIdsToChange(body)));

export default defineLogicFunction({
  universalIdentifier: SPLIT_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-split-picking',
  description: 'Moves what is not filled in yet out of a transfer into a backorder.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: SPLIT_PICKING_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
