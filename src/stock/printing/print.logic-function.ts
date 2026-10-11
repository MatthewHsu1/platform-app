import { defineLogicFunction } from 'twenty-sdk/define';

import { createCheckedPrintPass } from 'src/stock/printing/create-print-pass';
import { PRINT_MESSAGES } from 'src/stock/printing/print-messages.constant';
import { DEFAULT_PRINT_TIME_ZONE, isTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { isOverIdLimit, isPrintOptionsSizeAllowed, PRINT_OPTION_MAX_IDS } from 'src/stock/printing/utils/print-options.util';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import { StockUserError } from 'src/stock/stock-errors';
import {
  PRINT_ROUTE_PATH,
  PRINTING_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-printing-universal-identifiers.constant';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readOptions = (value: unknown) => {
  if (value === undefined || value === null) {
    return {};
  }
  if (isPlainObject(value) && isOverIdLimit(value)) {
    throw new StockUserError(PRINT_MESSAGES.tooManyLines, { max: PRINT_OPTION_MAX_IDS });
  }
  if (!isPlainObject(value) || !isPrintOptionsSizeAllowed(value)) {
    throw new StockUserError(PRINT_MESSAGES.optionsNotValid);
  }

  return value;
};

// The pop-up sends the browser's zone; a caller without one prints in UTC.
const readTimeZone = (value: unknown) => {
  if (value === undefined || value === null) {
    return DEFAULT_PRINT_TIME_ZONE;
  }
  if (typeof value !== 'string' || !isTimeZone(value)) {
    throw new StockUserError(PRINT_MESSAGES.timeZoneNotValid);
  }

  return value;
};

// Answers a one-time link to the print page; the page itself is served by the public print view route.
const handler = stockRouteHandler(async (body) => {
  const { report, objectSingular } = body;

  if (typeof report !== 'string' || typeof objectSingular !== 'string') {
    throw new StockUserError(PRINT_MESSAGES.chooseReport);
  }
  const created = await createCheckedPrintPass({
    report,
    objectSingular,
    recordIds: readIds(body, 'recordIds'),
    options: readOptions(body.options),
    timeZone: readTimeZone(body.timeZone),
  });

  if (created === null) {
    throw new StockUserError(PRINT_MESSAGES.nothingToPrint);
  }

  return { links: [created.link] };
});

export default defineLogicFunction({
  universalIdentifier: PRINTING_UNIVERSAL_IDENTIFIERS.printLogicFunction,
  name: 'platform-stock-print',
  description: 'Checks what the user may print and answers a one-time link to the printable page.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: PRINT_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
