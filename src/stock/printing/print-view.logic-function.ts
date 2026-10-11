import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { kv, Response } from 'twenty-sdk/logic-function';

import { translate } from 'src/shared/i18n/translate';
import { barcodeSvg } from 'src/stock/printing/barcode-svg';
import { buildPrintOutput } from 'src/stock/printing/build-print-output';
import { PRINT_PAGE_MESSAGES } from 'src/stock/printing/print-messages.constant';
import { type PrintPass } from 'src/stock/printing/types/print-pass.type';
import { attachmentDisposition } from 'src/stock/printing/utils/content-disposition.util';
import { isPrintPassLive, isPrintPassToken, printPassKey } from 'src/stock/printing/utils/print-pass.util';
import { renderHtml, renderMessagePage } from 'src/stock/printing/utils/render-html.util';
import { StockUserError } from 'src/stock/stock-errors';
import {
  PRINT_VIEW_ROUTE_PATH,
  PRINTING_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-printing-universal-identifiers.constant';

const htmlResponse = (html: string, status: number) =>
  new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });

const linkNotValid = () => htmlResponse(renderMessagePage(PRINT_PAGE_MESSAGES.linkNotValid), 404);

// The pass is used up before anything is read, so a link prints once.
const takePass = async (pass: string): Promise<PrintPass | null> => {
  const key = printPassKey(pass);
  const stored = await kv.get<PrintPass>(key);

  if (stored === null || !(await kv.delete(key))) {
    return null;
  }

  return isPrintPassLive(stored, new Date()) ? stored : null;
};

// Public: a browser tab opened from the print pop-up has no Twenty token. The pass
// carries the ids already checked as the person, so the printables read as the application.
const handler = async (payload: RoutePayload) => {
  let printing = 'a print link';

  try {
    const pass = payload.queryStringParameters?.pass ?? '';
    const stored = isPrintPassToken(pass) ? await takePass(pass) : null;

    if (stored === null) {
      return linkNotValid();
    }
    printing = `${stored.report} on ${stored.objectSingular}`;
    const { output, fileName } = await buildPrintOutput(stored);

    if (output.kind === 'zpl') {
      return new Response(output.text, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-disposition': attachmentDisposition(`${fileName}.zpl`),
          'cache-control': 'no-store',
        },
      });
    }

    return htmlResponse(renderHtml(output, fileName, barcodeSvg), 200);
  } catch (error) {
    if (error instanceof StockUserError) {
      return htmlResponse(renderMessagePage(translate('en', error.message, error.values)), 409);
    }

    // The only trace a public page leaves for staff: the report and the cause, never the pass.
    console.error(`Could not print ${printing}: ${error instanceof Error ? error.message : String(error)}`);

    return htmlResponse(renderMessagePage(PRINT_PAGE_MESSAGES.failed), 500);
  }
};

export default defineLogicFunction({
  universalIdentifier: PRINTING_UNIVERSAL_IDENTIFIERS.printViewLogicFunction,
  name: 'platform-stock-print-view',
  description: 'Serves a printable page or a ZPL file once for a print link.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: PRINT_VIEW_ROUTE_PATH, httpMethod: 'GET', isAuthRequired: false },
});
