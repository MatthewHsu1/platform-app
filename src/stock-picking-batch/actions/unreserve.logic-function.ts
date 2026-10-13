import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readBatchIdsToChange } from 'src/stock-picking-batch/actions/batch-action-route';
import { unreserveBatches } from 'src/stock-picking-batch/actions/batch-buttons';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  await unreserveBatches(await readBatchIdsToChange(body));

  return { message: translate(await readUserLocale(), BATCH_MESSAGES.unreserved) };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.unreserve,
  name: 'stock-picking-batch-unreserve',
  description: 'Gives back the stock reserved for the transfers of the selected batches.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.unreserve, httpMethod: 'POST', isAuthRequired: true },
});
