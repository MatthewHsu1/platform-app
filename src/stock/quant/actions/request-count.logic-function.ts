import { defineLogicFunction } from 'twenty-sdk/define';

import { readOptionalText, requestCount, requireReadableQuantIds } from 'src/stock/quant/actions/count-actions';
import { stockRouteHandler } from 'src/stock/stock-route';
import { todayUtc } from 'src/stock/stock-settings';
import {
  REQUEST_COUNT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  REQUEST_COUNT_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default defineLogicFunction({
  universalIdentifier: REQUEST_COUNT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-request-count',
  description: 'Schedules a count of the selected stock rows and, when given, assigns it.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => {
    const inventoryDate = readOptionalText(body.inventoryDate);

    return requestCount(
      await requireReadableQuantIds(body),
      inventoryDate !== null && DATE_PATTERN.test(inventoryDate) ? inventoryDate : todayUtc(),
      readOptionalText(body.assignedUserId),
    );
  }),
  httpRouteTriggerSettings: { path: REQUEST_COUNT_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
