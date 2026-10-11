import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readBatchIdToChange } from 'src/stock-picking-batch/actions/batch-action-route';
import { cancelBatchButton } from 'src/stock-picking-batch/actions/batch-buttons';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import {
  STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_ROUTE_PATHS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';

const handler = stockRouteHandler(async (body) => {
  await cancelBatchButton(await readBatchIdToChange(body));

  return { message: translate(await readUserLocale(), BATCH_MESSAGES.cancelled) };
});

export default defineLogicFunction({
  universalIdentifier: STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.cancel,
  name: 'stock-picking-batch-cancel',
  description: 'Cancels a batch in progress; its transfers leave it and stay as they are.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: STOCK_PICKING_BATCH_ROUTE_PATHS.cancel, httpMethod: 'POST', isAuthRequired: true },
});
