import { defineLogicFunction } from 'twenty-sdk/define';

import { readOptionalText } from 'src/stock/quant/actions/count-actions';
import { createScrapFromPicking } from 'src/stock/scrap/actions/scrap-choices';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import {
  SCRAP_PRODUCTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SCRAP_PRODUCTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const TRANSFER_NOT_FOUND_MESSAGE = 'Open a transfer you can see first.';
const SCRAP_FORM_MESSAGE = 'Fill in the product, unit, quantity and both locations.';

export default defineLogicFunction({
  universalIdentifier: SCRAP_PRODUCTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-from-picking',
  description: 'Makes a scrap from a transfer and validates it.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) => {
    const pickingId = readOptionalText(body.pickingId);
    const [readable] = await filterReadableIds('stockPicking', 'stockPickings', pickingId === null ? [] : [pickingId]);

    if (readable === undefined) {
      throw new StockUserError(TRANSFER_NOT_FOUND_MESSAGE);
    }
    const productId = readOptionalText(body.productId);
    const productUomId = readOptionalText(body.productUomId);
    const locationId = readOptionalText(body.locationId);
    const scrapLocationId = readOptionalText(body.scrapLocationId);
    const scrapQty = typeof body.scrapQty === 'number' && Number.isFinite(body.scrapQty) ? body.scrapQty : null;

    if (productId === null || productUomId === null || locationId === null || scrapLocationId === null || scrapQty === null) {
      throw new StockUserError(SCRAP_FORM_MESSAGE);
    }

    return createScrapFromPicking({
      pickingId: readable,
      productId,
      productUomId,
      scrapQty,
      locationId,
      scrapLocationId,
      ownerId: readOptionalText(body.ownerId),
      reasonTagIds: readIds(body, 'reasonTagIds'),
      shouldReplenish: body.shouldReplenish === true,
    });
  }),
  httpRouteTriggerSettings: { path: SCRAP_PRODUCTS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
