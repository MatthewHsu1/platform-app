import { defineLogicFunction } from 'twenty-sdk/define';

import { readTraceabilityRequest } from 'src/stock/reports/traceability/read-traceability-request';
import { traceabilityReport } from 'src/stock/reports/traceability/read-traceability';
import { TRACEABILITY_ROUTE_PATH, TRACEABILITY_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';
import { readStockSettings } from 'src/stock/stock-settings';

const handler = stockRouteHandler(async (body) => traceabilityReport(readTraceabilityRequest(body), readStockSettings().productUnitDigits));

export default defineLogicFunction({
  universalIdentifier: TRACEABILITY_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-traceability',
  description: 'Where a lot or serial number came from and where it went.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: TRACEABILITY_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
