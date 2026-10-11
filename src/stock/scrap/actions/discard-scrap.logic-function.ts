import { defineLogicFunction } from 'twenty-sdk/define';

import { discardScrap } from 'src/stock/scrap/actions/validate-scrap';
import { filterReadableIds } from 'src/stock/stock-access';
import { requireUpdateRights } from 'src/shared/object-rights';
import { StockUserError } from 'src/stock/stock-errors';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import {
  DISCARD_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  DISCARD_SCRAP_ROUTE_PATH,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

const SCRAP_NOT_FOUND_MESSAGE = 'Open one scrap you can see first.';

export default defineLogicFunction({
  universalIdentifier: DISCARD_SCRAP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-discard',
  description: 'Removes a draft scrap when the insufficient-quantity pop-up is discarded.',
  timeoutSeconds: 30,
  handler: stockRouteHandler(async (body) => {
    const scrapIds = readIds(body, 'scrapIds');
    const readable = await filterReadableIds('stockScrap', 'stockScraps', scrapIds);

    // The pop-up discards the one scrap it asked about, as Validate takes one.
    if (scrapIds.length !== 1 || readable.length !== 1) {
      throw new StockUserError(SCRAP_NOT_FOUND_MESSAGE);
    }
    await requireUpdateRights([STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER]);
    await discardScrap(readable[0]);

    return { kind: 'done' };
  }),
  httpRouteTriggerSettings: { path: DISCARD_SCRAP_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
