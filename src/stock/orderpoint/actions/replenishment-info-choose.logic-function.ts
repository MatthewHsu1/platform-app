import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readText } from 'src/shared/utils/read-text.util';
import { requireOrderpointUpdateRight } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { readOrderpointForPerson, readResupplyOptions } from 'src/stock/orderpoint/read-replenishment-info';
import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { StockUserError } from 'src/stock/stock-errors';
import { updateAsUser } from 'src/stock/stock-person-writes';
import { stockRouteHandler } from 'src/stock/stock-route';
import { readStockSettings } from 'src/stock/stock-settings';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

type ChooseRow = { id: string; productId: string | null; warehouseId: string | null; qtyToOrder: number | null };

// Order all: the rule keeps its quantity and orders it through the chosen
// route. Order available: the quantity becomes what that warehouse has free,
// read again here rather than taken from the pop-up.
const handler = stockRouteHandler(async (body) => {
  const row = await readOrderpointForPerson<ChooseRow>(
    readText(body.orderpointId) ?? '',
    'id productId warehouseId qtyToOrder',
  );

  await requireOrderpointUpdateRight();

  const routeId = readText(body.routeId);
  const routing = row.productId === null ? null : await readRoutingData([row.productId]);
  const product = row.productId === null ? undefined : routing?.products.get(row.productId);
  const options =
    product === undefined || routing === null || row.warehouseId === null
      ? []
      : await readResupplyOptions({
          warehouseId: row.warehouseId,
          product,
          data: routing.data,
          qtyToOrder: row.qtyToOrder ?? 0,
          digits: readStockSettings().productUnitDigits,
        });
  const option = options.find((candidate) => candidate.routeId === routeId);

  if (option === undefined) {
    throw new StockUserError(ORDERPOINT_MESSAGES.resupplyRouteRefused);
  }
  if (body.orderAvailable === true && option.freeQty <= 0) {
    throw new StockUserError(ORDERPOINT_MESSAGES.nothingToOrder);
  }
  // Written as the clicking user; a typed quantity is kept by the rule's trigger as the person's own.
  await updateAsUser(
    'stockWarehouseOrderpoint',
    [row.id],
    body.orderAvailable === true ? { routeId: option.routeId, qtyToOrder: option.freeQty } : { routeId: option.routeId },
  );

  return { message: translate(await readUserLocale(), ORDERPOINT_MESSAGES.routeChosen) };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenishmentInfoChoose,
  name: 'stock-orderpoint-replenishment-info-choose',
  description: 'Sets the resupply route chosen in the replenishment information pop-up, with all or only the available quantity.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenishmentInfoChoose, httpMethod: 'POST', isAuthRequired: true },
});
