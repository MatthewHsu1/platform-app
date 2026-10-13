import { defineLogicFunction } from 'twenty-sdk/define';

import { readReplenishForm, readReplenishFormRequest } from 'src/stock/orderpoint/read-replenish-form';
import { stockRouteHandler } from 'src/stock/stock-route';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenishDefaults,
  name: 'stock-replenish-defaults',
  description: 'Reads what the Replenish pop-up shows for a product: units, warehouses, allowed routes, the forecast and the default values.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => readReplenishForm(readReplenishFormRequest(body))),
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenishDefaults, httpMethod: 'POST', isAuthRequired: true },
});
