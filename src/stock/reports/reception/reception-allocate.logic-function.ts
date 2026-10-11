import { defineLogicFunction } from 'twenty-sdk/define';

import { allocate } from 'src/stock/reports/reception/apply-allocation';
import { readAllocateRequest } from 'src/stock/reports/reception/read-allocation-request';
import {
  RECEPTION_ALLOCATE_ROUTE_PATH,
  RECEPTION_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  const run = await allocate(await readAllocateRequest(body));

  return { linked: run.kind === 'allocate' ? run.plan.links.length : 0 };
});

export default defineLogicFunction({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.allocateLogicFunction,
  name: 'platform-stock-reception-allocate',
  description: 'Allocates incoming moves to waiting delivery moves (they become make to order) and reserves the deliveries again.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: RECEPTION_ALLOCATE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
