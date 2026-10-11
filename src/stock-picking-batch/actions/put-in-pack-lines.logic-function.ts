import { defineLogicFunction } from 'twenty-sdk/define';

import { readRequestedBatchId } from 'src/stock-picking-batch/actions/batch-action-route';
import { readBatchPackLines } from 'src/stock-picking-batch/actions/batch-buttons';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => ({ moveLineIds: await readBatchPackLines(await readRequestedBatchId(body)) }));

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.putInPackLines,
  name: 'stock-picking-batch-put-in-pack-lines',
  description: "Lists the open move lines of a batch's transfers for Put in Pack.",
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.putInPackLines, httpMethod: 'POST', isAuthRequired: true },
});
