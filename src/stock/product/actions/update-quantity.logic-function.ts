import { defineLogicFunction } from 'twenty-sdk/define';

import { NO_STOCK_ROW_SELECTED_MESSAGE } from 'src/stock/quant/actions/count-actions';
import { updateQuantity } from 'src/stock/quant/actions/update-quantity';
import { type QuantityUpdateRow } from 'src/stock/quant/types/quantity-update-row.type';
import { filterReadableIds, requireStockManagerRight } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  UPDATE_QUANTITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  UPDATE_QUANTITY_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const NO_PRODUCT_MESSAGE = 'Open a product you can see first.';

const readRows = (value: unknown): QuantityUpdateRow[] =>
  Array.isArray(value)
    ? value.flatMap((entry: unknown) => {
        const row = (typeof entry === 'object' && entry !== null ? entry : {}) as Record<string, unknown>;

        return typeof row.productId === 'string' &&
          typeof row.locationId === 'string' &&
          typeof row.onHand === 'number' &&
          Number.isFinite(row.onHand) &&
          typeof row.counted === 'number' &&
          Number.isFinite(row.counted)
          ? [
              {
                quantId: typeof row.quantId === 'string' ? row.quantId : null,
                productId: row.productId,
                locationId: row.locationId,
                lotId: typeof row.lotId === 'string' && row.lotId !== '' ? row.lotId : null,
                onHand: row.onHand,
                counted: row.counted,
              },
            ]
          : [];
      })
    : [];

export default defineLogicFunction({
  universalIdentifier: UPDATE_QUANTITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-product-update-quantity',
  description: "Applies the counts typed in a product's Update quantity list at once.",
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) => {
    const rows = readRows(body.rows);
    const productIds = [...new Set(rows.map((row) => row.productId))];
    const quantIds = [...new Set(rows.flatMap((row) => (row.quantId === null ? [] : [row.quantId])))];
    const readable = await filterReadableIds('productProduct', 'productProducts', productIds);
    const readableQuants = await filterReadableIds('stockQuant', 'stockQuants', quantIds);

    if (rows.length === 0 || readable.length !== productIds.length) {
      throw new StockUserError(NO_PRODUCT_MESSAGE);
    }
    if (readableQuants.length !== quantIds.length) {
      throw new StockUserError(NO_STOCK_ROW_SELECTED_MESSAGE);
    }

    await requireUpdateRights([STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER]);
    // Editing on-hand quantities from the product is the inventory manager's.
    await requireStockManagerRight();

    return updateQuantity(rows);
  }),
  httpRouteTriggerSettings: { path: UPDATE_QUANTITY_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
