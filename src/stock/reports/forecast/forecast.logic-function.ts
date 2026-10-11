import { defineLogicFunction } from 'twenty-sdk/define';

import { readForecastData } from 'src/stock/reports/forecast/read-forecast-data';
import { readForecastRequest } from 'src/stock/reports/forecast/read-forecast-request';
import { FORECAST_ROUTE_PATH, FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => readForecastData(readForecastRequest(body)));

export default defineLogicFunction({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-forecast',
  description: 'Forecasted report: how stock and planned receipts cover planned deliveries in a warehouse.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: FORECAST_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
