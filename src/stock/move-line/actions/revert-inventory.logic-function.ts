import { defineLogicFunction } from 'twenty-sdk/define';

import { revertInventory } from 'src/stock/move-line/actions/revert-inventory';
import { filterReadableIds } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import {
  REVERT_INVENTORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  REVERT_INVENTORY_ROUTE_PATH,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { NO_INVENTORY_TO_REVERT_MESSAGE } from 'src/stock/utils/plan-revert-inventory.util';

export default defineLogicFunction({
  universalIdentifier: REVERT_INVENTORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-move-line-revert-inventory',
  description: 'Undoes the selected inventory adjustment lines with mirror moves, validated at once.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) => {
    const moveLineIds = await filterReadableIds('stockMoveLine', 'stockMoveLines', readIds(body, 'moveLineIds'));

    if (moveLineIds.length === 0) {
      throw new StockUserError(NO_INVENTORY_TO_REVERT_MESSAGE);
    }

    // Reverting makes new inventory moves.
    await requireUpdateRights([STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER]);

    return revertInventory(moveLineIds);
  }),
  httpRouteTriggerSettings: { path: REVERT_INVENTORY_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
