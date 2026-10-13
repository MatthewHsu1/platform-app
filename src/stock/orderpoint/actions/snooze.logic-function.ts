import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { readOrderpointIdsToChange } from 'src/stock/orderpoint/actions/orderpoint-action-route';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { snoozeRefusal } from 'src/stock/orderpoint/utils/snooze-refusal.util';
import { StockUserError } from 'src/stock/stock-errors';
import { updateAsUser } from 'src/stock/stock-person-writes';
import { stockRouteHandler } from 'src/stock/stock-route';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The pattern alone lets through days that do not exist, such as 2026-02-30.
const readDay = (value: unknown) => {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value) ? value : null;
};

const handler = stockRouteHandler(async (body) => {
  const orderpointIds = await readOrderpointIdsToChange(body);
  const snoozedUntil = readDay(body.snoozedUntil);

  if (snoozedUntil === null) {
    throw new StockUserError(ORDERPOINT_MESSAGES.snoozeDateRequired);
  }
  const rows = await stockWarehouseOrderpoints.find<{ id: string; trigger: 'AUTO' | 'MANUAL' }>(
    { id: { in: orderpointIds } },
    'id trigger',
  );
  const isRefused = rows.some(
    (row) => snoozeRefusal({ created: false, trigger: row.trigger, snoozedUntil, snoozedUntilChanged: true }) !== null,
  );

  if (isRefused) {
    throw new StockUserError(ORDERPOINT_MESSAGES.snoozeAuto);
  }
  // Written as the clicking user: only someone who may edit reordering rules can snooze them.
  await updateAsUser('stockWarehouseOrderpoint', orderpointIds, { snoozedUntil });

  return { message: translate(await readUserLocale(), ORDERPOINT_MESSAGES.snoozed) };
});

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.snooze,
  name: 'stock-orderpoint-snooze',
  description: 'Hides the selected manual reordering rules from the Not Snoozed list until a date.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: ORDERPOINT_ROUTE_PATHS.snooze, httpMethod: 'POST', isAuthRequired: true },
});
