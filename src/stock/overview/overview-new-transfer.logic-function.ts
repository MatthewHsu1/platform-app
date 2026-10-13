import { defineLogicFunction } from 'twenty-sdk/define';

import { createOverviewTransfer } from 'src/stock/overview/create-overview-transfer';
import {
  OVERVIEW_NEW_TRANSFER_ROUTE_PATH,
  OVERVIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(createOverviewTransfer);

export default defineLogicFunction({
  universalIdentifier: OVERVIEW_UNIVERSAL_IDENTIFIERS.newTransferLogicFunction,
  name: 'platform-stock-overview-new-transfer',
  description: 'Creates a draft transfer of the chosen operation type.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: OVERVIEW_NEW_TRANSFER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
