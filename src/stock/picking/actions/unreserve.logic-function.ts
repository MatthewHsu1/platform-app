import { defineLogicFunction } from 'twenty-sdk/define';

import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { unreservePickings } from 'src/stock/picking/actions/unreserve-pickings';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  UNRESERVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  UNRESERVE_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readPickingIdsToChange(body);

  await unreservePickings(pickingIds);

  return { pickingIds };
});

export default defineLogicFunction({
  universalIdentifier: UNRESERVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-unreserve',
  description: 'Removes the unpicked move lines of the selected transfers and recomputes what stays reserved.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: UNRESERVE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
