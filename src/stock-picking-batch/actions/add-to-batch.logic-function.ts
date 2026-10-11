import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readText } from 'src/shared/utils/read-text.util';
import { addToBatch } from 'src/stock-picking-batch/actions/add-to-batch';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { readRunId } from 'src/stock/package/put-in-pack';
import { readRequestedPickingIds } from 'src/stock/picking/actions/read-requested-picking-ids';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  const result = await addToBatch({
    pickingIds: await readRequestedPickingIds(body),
    mode: body.mode === 'EXISTING' ? 'EXISTING' : 'NEW',
    batchId: readText(body.batchId),
    responsibleId: readText(body.responsibleId),
    description: readText(body.description),
    isCreateDraft: body.isCreateDraft === true,
    runId: readRunId(body),
  });
  const title = translate(await readUserLocale(), result.created ? BATCH_MESSAGES.batchCreated : BATCH_MESSAGES.batchUpdated);

  return { message: `${title}: ${result.name}` };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.addToBatch,
  name: 'stock-picking-batch-add-to-batch',
  description: 'Puts the selected transfers in a new or an existing batch transfer.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.addToBatch, httpMethod: 'POST', isAuthRequired: true },
});
