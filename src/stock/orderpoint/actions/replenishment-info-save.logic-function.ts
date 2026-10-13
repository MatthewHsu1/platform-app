import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readText } from 'src/shared/utils/read-text.util';
import { requireOrderpointUpdateRight } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { readOrderpointForPerson, readQuantity } from 'src/stock/orderpoint/read-replenishment-info';
import { planMinMaxSave } from 'src/stock/orderpoint/utils/replenishment-info.util';
import { StockUserError } from 'src/stock/stock-errors';
import { updateAsUser } from 'src/stock/stock-person-writes';
import { stockRouteHandler } from 'src/stock/stock-route';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

const handler = stockRouteHandler(async (body) => {
  const row = await readOrderpointForPerson<{ id: string }>(readText(body.orderpointId) ?? '', 'id');

  await requireOrderpointUpdateRight();

  const productMinQty = readQuantity(body.productMinQty);
  const productMaxQty = readQuantity(body.productMaxQty);

  if (productMinQty === null || productMaxQty === null) {
    throw new StockUserError(ORDERPOINT_MESSAGES.minMaxRequired);
  }
  // Refused here, before the write: the rule's own trigger would only put the
  // old values back after the save.
  const plan = planMinMaxSave({ productMinQty, productMaxQty });

  if (plan.kind === 'refused') {
    throw new StockUserError(ORDERPOINT_MESSAGES.minAboveMax);
  }
  // Written as the clicking user: only someone who may edit reordering rules can change them.
  await updateAsUser('stockWarehouseOrderpoint', [row.id], plan.data);

  return { message: translate(await readUserLocale(), ORDERPOINT_MESSAGES.saved) };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenishmentInfoSave,
  name: 'stock-orderpoint-replenishment-info-save',
  description: 'Saves the minimum and maximum typed in the replenishment information pop-up.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenishmentInfoSave, httpMethod: 'POST', isAuthRequired: true },
});
