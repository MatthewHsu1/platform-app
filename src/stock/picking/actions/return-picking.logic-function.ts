import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { readPickingIdsToChange } from 'src/stock/picking/actions/read-requested-picking-ids';
import { returnPicking } from 'src/stock/picking/actions/return-picking';
import { type ReturnAction } from 'src/stock/picking/types/return-action.type';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  RETURN_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  RETURN_PICKING_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const ACTIONS: ReturnAction[] = ['return', 'returnAll', 'exchange'];

const readRows = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap((entry: unknown) => {
        const row = (typeof entry === 'object' && entry !== null ? entry : {}) as { moveId?: unknown; quantity?: unknown };

        return typeof row.moveId === 'string' && typeof row.quantity === 'number' && Number.isFinite(row.quantity)
          ? [{ moveId: row.moveId, quantity: row.quantity }]
          : [];
      })
    : [];

const handler = stockRouteHandler(async (body) => {
  const pickingIds = await readPickingIdsToChange(body);
  const action = ACTIONS.find((candidate) => candidate === body.action);

  if (action === undefined) {
    throw new StockUserError('Choose Return, Return All or Return for Exchange.');
  }

  return returnPicking({ pickingIds, rows: readRows(body.rows), action, locale: await readUserLocale() });
});

export default defineLogicFunction({
  universalIdentifier: RETURN_PICKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-return-picking',
  description: 'Makes the return transfer of a done transfer, and the exchange when asked.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: RETURN_PICKING_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
