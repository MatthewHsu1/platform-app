import { defineLogicFunction } from 'twenty-sdk/define';

import { confirmPickings } from 'src/stock/picking/actions/confirm-pickings';
import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  MARK_AS_TODO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_AS_TODO_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readPickingIdsToChange(body);

  await confirmPickings(pickingIds);

  return { pickingIds };
});

export default defineLogicFunction({
  universalIdentifier: MARK_AS_TODO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-mark-as-todo',
  description:
    'Confirms the draft moves of the selected transfers, groups them into transfers, merges alike moves and reserves those that reserve at once.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: MARK_AS_TODO_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
