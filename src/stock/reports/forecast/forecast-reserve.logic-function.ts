import { defineLogicFunction } from 'twenty-sdk/define';

import { FORECAST_MESSAGES } from 'src/stock/reports/forecast/forecast-messages.constant';
import { forecastReserve } from 'src/stock/reports/forecast/forecast-reserve';
import { FORECAST_RESERVE_ROUTE_PATH, FORECAST_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import { requireUpdateRights } from 'src/stock/stock-access';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const { moveId, action } = body;

  if (typeof moveId !== 'string' || moveId.length === 0 || (action !== 'reserve' && action !== 'unreserve')) {
    throw new StockUserError(FORECAST_MESSAGES.invalidReserve);
  }
  // Reserving is a stock user's work on transfers and their moves.
  await requireUpdateRights([STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER]);

  return forecastReserve({ moveId, action });
});

export default defineLogicFunction({
  universalIdentifier: FORECAST_UNIVERSAL_IDENTIFIERS.reserveLogicFunction,
  name: 'platform-stock-forecast-reserve',
  description: 'Reserves or unreserves a delivery shown in the forecast and the moves chained before it.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: FORECAST_RESERVE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
