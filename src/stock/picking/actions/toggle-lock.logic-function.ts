import { defineLogicFunction } from 'twenty-sdk/define';

import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { toggleLock } from 'src/stock/picking/actions/toggle-lock';
import { requireStockManagerRight } from 'src/stock/stock-access';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  TOGGLE_LOCK_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  TOGGLE_LOCK_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

// Locking and unlocking a transfer is the inventory manager's.
const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readPickingIdsToChange(body);

  await requireStockManagerRight();

  return toggleLock(pickingIds);
});

export default defineLogicFunction({
  universalIdentifier: TOGGLE_LOCK_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-toggle-lock-picking',
  description: 'Locks or unlocks a transfer.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: TOGGLE_LOCK_PICKING_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
