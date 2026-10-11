import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readRequestedBatchIds } from 'src/stock-picking-batch/actions/batch-action-route';
import { mergeBatches } from 'src/stock-picking-batch/actions/merge-batches';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  const name = await mergeBatches(await readRequestedBatchIds(body));

  return { message: `${translate(await readUserLocale(), BATCH_MESSAGES.merged)}: ${name}` };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.merge,
  name: 'stock-picking-batch-merge',
  description: 'Merges the selected batches into the first one selected and deletes the others.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.merge, httpMethod: 'POST', isAuthRequired: true },
});
