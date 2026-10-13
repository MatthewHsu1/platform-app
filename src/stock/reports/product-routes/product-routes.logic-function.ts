import { defineLogicFunction } from 'twenty-sdk/define';

import { readProductRoutes } from 'src/stock/reports/product-routes/read-product-routes';
import { PRODUCT_ROUTES_ROUTE_PATH, PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(readProductRoutes);

export default defineLogicFunction({
  universalIdentifier: PRODUCT_ROUTES_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-product-routes',
  description: 'The routes and rules a product follows in the chosen warehouses, with the reordering and putaway rules of each location.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: PRODUCT_ROUTES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
