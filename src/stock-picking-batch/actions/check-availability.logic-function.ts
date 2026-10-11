import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readRequestedBatchId } from 'src/stock-picking-batch/actions/batch-action-route';
import { checkBatchAvailability } from 'src/stock-picking-batch/actions/batch-buttons';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  await checkBatchAvailability(await readRequestedBatchId(body));

  return { message: translate(await readUserLocale(), BATCH_MESSAGES.checked) };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.checkAvailability,
  name: 'stock-picking-batch-check-availability',
  description: 'Reserves stock for the transfers of a batch, marking draft ones as to do first.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.checkAvailability, httpMethod: 'POST', isAuthRequired: true },
});
