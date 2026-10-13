import { StockUserError } from 'src/stock/stock-errors';
import { filterReadableIds } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { readIds } from 'src/stock/stock-route';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { type OrderMode } from 'src/stock/orderpoint/types/order-mode.type';
import { STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const ORDER_MODES: OrderMode[] = ['ORDER', 'ORDER_TO_MAX', 'AUTOMATE'];

// The clicking user must be able to read every reordering rule they asked for.
export const readRequestedOrderpointIds = async (body: Record<string, unknown>) => {
  const requested = readIds(body, 'orderpointIds');
  const readable = await filterReadableIds('stockWarehouseOrderpoint', 'stockWarehouseOrderpoints', requested);

  if (requested.length === 0 || readable.length !== requested.length) {
    throw new StockUserError(ORDERPOINT_MESSAGES.notFound);
  }

  return readable;
};

export const requireOrderpointUpdateRight = () => requireUpdateRights([STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER]);

// The requested reordering rules, for a button that changes them: the user's role must allow editing them.
export const readOrderpointIdsToChange = async (body: Record<string, unknown>) => {
  const orderpointIds = await readRequestedOrderpointIds(body);

  await requireOrderpointUpdateRight();

  return orderpointIds;
};

export const readOrderMode = (body: Record<string, unknown>): OrderMode =>
  ORDER_MODES.find((mode) => mode === body.mode) ?? 'ORDER';
