import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { readReplenishmentInfo, readReplenishmentInfoRequest } from 'src/stock/orderpoint/read-replenishment-info';
import { stockRouteHandler } from 'src/stock/stock-route';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenishmentInfo,
  name: 'stock-orderpoint-replenishment-info',
  description: 'Explains the quantity of a reordering rule: lead days, a demand graph and the warehouses that can resupply it.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => readReplenishmentInfo(readReplenishmentInfoRequest(body), await readUserLocale())),
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenishmentInfo, httpMethod: 'POST', isAuthRequired: true },
});
