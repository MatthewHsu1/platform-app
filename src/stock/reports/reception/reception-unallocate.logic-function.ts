import { defineLogicFunction } from 'twenty-sdk/define';

import { unallocate } from 'src/stock/reports/reception/apply-allocation';
import { readUnallocateRequest } from 'src/stock/reports/reception/read-allocation-request';
import {
  RECEPTION_UNALLOCATE_ROUTE_PATH,
  RECEPTION_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';
import { requireUpdateRights } from 'src/shared/object-rights';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const request = await readUnallocateRequest(body);

  await requireUpdateRights([STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER, STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER]);

  const run = await unallocate(request);

  return { unlinked: run.kind === 'unallocate' ? run.plan.unlinks.length : 0 };
});

export default defineLogicFunction({
  universalIdentifier: RECEPTION_UNIVERSAL_IDENTIFIERS.unallocateLogicFunction,
  name: 'platform-stock-reception-unallocate',
  description: 'Takes incoming moves off a delivery move (back to take from stock) and unreserves it.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: RECEPTION_UNALLOCATE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
