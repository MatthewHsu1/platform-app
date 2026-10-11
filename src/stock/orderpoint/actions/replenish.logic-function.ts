import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readText } from 'src/shared/utils/read-text.util';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { readReplenishChoices } from 'src/stock/orderpoint/read-replenish-form';
import { replenishProduct } from 'src/stock/orderpoint/replenish-product';
import { isOfferedReplenishChoice } from 'src/stock/orderpoint/utils/replenish-defaults.util';
import { StockUserError } from 'src/stock/stock-errors';
import { stockRouteHandler } from 'src/stock/stock-route';
import {
  ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_ROUTE_PATHS,
} from 'src/stock/stock-universal-identifiers.constant';

const readDateTime = (value: unknown) => {
  const parsed = typeof value === 'string' ? new Date(value) : null;

  return parsed === null || Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

// Orders the product into the chosen warehouse's stock through the chosen
// route. The choices are read again, so only what the pop-up offers goes
// through. Without a transfer to name, the pop-up just closes.
const handler = stockRouteHandler(async (body) => {
  const chosen = {
    variantId: readText(body.variantId),
    warehouseId: readText(body.warehouseId),
    uomId: readText(body.uomId),
    routeId: readText(body.routeId),
  };
  const quantity = typeof body.quantity === 'number' && Number.isFinite(body.quantity) ? body.quantity : null;
  const datePlanned = readDateTime(body.datePlanned);
  const { form, lotStockId } = await readReplenishChoices({
    productTemplateId: null,
    productId: chosen.variantId,
    warehouseId: chosen.warehouseId,
    routeId: chosen.routeId,
  });
  const offered = {
    variantId: form.variantId,
    warehouseId: form.warehouseId,
    unitIds: form.units.map((unit) => unit.id),
    routeIds: form.routes.map((route) => route.id),
  };

  if (
    !isOfferedReplenishChoice(offered, chosen) ||
    chosen.variantId === null ||
    chosen.warehouseId === null ||
    chosen.uomId === null ||
    lotStockId === null ||
    quantity === null ||
    datePlanned === null
  ) {
    throw new StockUserError(ORDERPOINT_MESSAGES.replenishChoiceRefused);
  }
  // The source document of the moves is record data, kept in one language.
  const origin = translate('en', ORDERPOINT_MESSAGES.manualReplenishment);
  const outcome = await replenishProduct({
    productId: chosen.variantId,
    productQty: quantity,
    productUomId: chosen.uomId,
    locationId: lotStockId,
    name: origin,
    origin,
    values: {
      warehouseId: chosen.warehouseId,
      routeIds: chosen.routeId === null ? [] : [chosen.routeId],
      datePlanned,
    },
  });
  // The order is written: a failed locale read must not turn it into an error.
  const locale = await readUserLocale().catch(() => 'en');

  if (outcome.kind === 'unconfirmed') {
    return { message: translate(locale, ORDERPOINT_MESSAGES.ordered) };
  }

  return {
    message:
      outcome.pickingName === null
        ? null
        : `${translate(locale, ORDERPOINT_MESSAGES.replenishGenerated)}: ${outcome.pickingName}`,
  };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.replenish,
  name: 'stock-replenish',
  description: "Orders more of a product into a warehouse's stock, through the chosen route.",
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.replenish, httpMethod: 'POST', isAuthRequired: true },
});
