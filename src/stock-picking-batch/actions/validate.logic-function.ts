import { defineLogicFunction } from 'twenty-sdk/define';

import { readRequestedBatchId } from 'src/stock-picking-batch/actions/batch-action-route';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { readBatchValidateAnswer } from 'src/stock-picking-batch/utils/batch-validate-answer.util';
import { validateBatch } from 'src/stock-picking-batch/validate-batch';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => validateBatch(await readRequestedBatchId(body), readBatchValidateAnswer(body)));

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.validate,
  name: 'stock-picking-batch-validate',
  description: 'Validates the transfers of a batch that have quantities and lets the others leave the batch.',
  timeoutSeconds: 900,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.validate, httpMethod: 'POST', isAuthRequired: true },
});
