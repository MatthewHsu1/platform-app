import { defineLogicFunction } from 'twenty-sdk/define';

import { readOverview } from 'src/stock/overview/read-overview';
import { OVERVIEW_ROUTE_PATH, OVERVIEW_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(readOverview);

export default defineLogicFunction({
  universalIdentifier: OVERVIEW_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-overview',
  description: 'Counts the open transfers of each active operation type for the Inventory overview.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: OVERVIEW_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
