import { defineLogicFunction } from 'twenty-sdk/define';

import { readOptionalText } from 'src/stock/quant/actions/count-actions';
import { readScrapChoices } from 'src/stock/scrap/actions/scrap-choices';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  SCRAP_CHOICES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SCRAP_CHOICES_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';

const TRANSFER_NOT_FOUND_MESSAGE = 'Open a transfer you can see first.';

export default defineLogicFunction({
  universalIdentifier: SCRAP_CHOICES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'stock-scrap-choices',
  description: 'Lists what the Scrap pop-up of a transfer offers: its goods, their units, locations, owners, reasons.',
  timeoutSeconds: 60,
  handler: stockRouteHandler(async (body) => {
    const pickingId = readOptionalText(body.pickingId);
    const [readable] = await filterReadableIds('stockPicking', 'stockPickings', pickingId === null ? [] : [pickingId]);

    if (readable === undefined) {
      throw new StockUserError(TRANSFER_NOT_FOUND_MESSAGE);
    }

    return readScrapChoices(readable);
  }),
  httpRouteTriggerSettings: { path: SCRAP_CHOICES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
