import { defineLogicFunction } from 'twenty-sdk/define';

import { createPrintPass } from 'src/stock/printing/create-print-pass';
import { PRINT_MESSAGES } from 'src/stock/printing/print-messages.constant';
import { AFTER_PRINT, PRINTABLE_OBJECTS } from 'src/stock/printing/printable-objects';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { readIds, stockRouteHandler } from 'src/stock/stock-route';
import { StockUserError } from 'src/stock/stock-errors';
import {
  PRINT_ROUTE_PATH,
  PRINTING_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-printing-universal-identifiers.constant';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Answers a one-time link to the print page; the page itself is served by the public print view route.
const handler = stockRouteHandler(async (body) => {
  const { report, objectSingular } = body;
  const reports = typeof objectSingular === 'string' ? PRINTABLE_OBJECTS[objectSingular]?.reports : undefined;

  if (typeof report !== 'string' || typeof objectSingular !== 'string' || reports?.includes(report as PrintReportKey) !== true) {
    throw new StockUserError(PRINT_MESSAGES.chooseReport);
  }
  const created = await createPrintPass({
    report: report as PrintReportKey,
    objectSingular,
    recordIds: readIds(body, 'recordIds'),
    options: isPlainObject(body.options) ? body.options : {},
  });

  if (created === null) {
    throw new StockUserError(PRINT_MESSAGES.nothingToPrint);
  }
  // Some prints change the record at the click, as marking a transfer printed does.
  await AFTER_PRINT[report as PrintReportKey]?.(created.recordIds);

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
