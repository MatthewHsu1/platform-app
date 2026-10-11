import { defineLogicFunction } from 'twenty-sdk/define';

import { validateScrap } from 'src/stock/scrap/actions/validate-scrap';
import { filterReadableIds } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import {
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  VALIDATE_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  VALIDATE_SCRAP_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const SCRAP_NOT_FOUND_MESSAGE = 'Open one scrap you can see first.';

export default defineLogicFunction({
  universalIdentifier: VALIDATE_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-validate',
  description: 'Scraps the quantity of a draft scrap, asking first when the source location holds less.',
  timeoutSeconds: 300,
  handler: stockRouteHandler(async (body) => {
    const scrapIds = readIds(body, 'scrapIds');
    const readable = await filterReadableIds('stockScrap', 'stockScraps', scrapIds);

    // One scrap per Validate, as the scrap form validates its own record.
    if (scrapIds.length !== 1 || readable.length !== 1) {
      throw new StockUserError(SCRAP_NOT_FOUND_MESSAGE);
    }

    await requireUpdateRights([STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER]);

    return validateScrap(readable[0], { confirmInsufficient: body.confirmInsufficient === true });
  }),
  httpRouteTriggerSettings: { path: VALIDATE_SCRAP_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
