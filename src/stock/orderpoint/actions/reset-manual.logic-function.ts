import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { stockRouteHandler } from 'src/stock/stock-route';
import { readRequestedOrderpointIds } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const orderpointIds = await readRequestedOrderpointIds(body);
  const typed = await stockWarehouseOrderpoints.find<{ id: string; qtyToOrderManual: number | null }>(
    { id: { in: orderpointIds } },
    'id qtyToOrderManual',
  );

  await stockWarehouseOrderpoints.updateMany(
    typed.filter((row) => (row.qtyToOrderManual ?? 0) !== 0).map((row) => row.id),
    { qtyToOrderManual: 0 },
  );
  const { failures } = await recomputeOrderpoint(orderpointIds);
  const locale = await readUserLocale();

  return {
    message: translate(locale, ORDERPOINT_MESSAGES.resetManual),
    details: failures.map((failure) => translate(locale, failure.error.message, failure.error.values)).join('\n'),
  };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.resetManual,
  name: 'stock-orderpoint-reset-manual',
  description: 'Drops the typed quantity to order of the selected reordering rules, back to the computed one.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.resetManual, httpMethod: 'POST', isAuthRequired: true },
});
