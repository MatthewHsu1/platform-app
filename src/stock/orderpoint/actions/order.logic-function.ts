import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { stockRouteHandler } from 'src/stock/stock-route';
import { readOrderMode, readRequestedOrderpointIds } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { orderOrderpoints } from 'src/stock/orderpoint/order-orderpoints';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const orderpointIds = await readRequestedOrderpointIds(body);
  const outcome = await orderOrderpoints(orderpointIds, readOrderMode(body));
  const locale = await readUserLocale();
  const text = translate(locale, outcome.message.message, outcome.message.values);

  return {
    message: outcome.pickingName === null ? text : `${text}: ${outcome.pickingName}`,
    details: outcome.details.map((detail) => translate(locale, detail.message, detail.values)).join('\n'),
  };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.order,
  name: 'stock-orderpoint-order',
  description: 'Orders from the selected reordering rules: their quantity to order, up to their maximum, or after making them automatic.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.order, httpMethod: 'POST', isAuthRequired: true },
});
