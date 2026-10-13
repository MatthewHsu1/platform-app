import { defineLogicFunction } from 'twenty-sdk/define';

import { readStatusTargets } from 'src/stock/reports/status/read-status-targets';
import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS, STATUS_TARGETS_ROUTE_PATH } from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(readStatusTargets);

export default defineLogicFunction({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-status-targets',
  description: 'Finds the records a transfer or product status button opens.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: STATUS_TARGETS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
