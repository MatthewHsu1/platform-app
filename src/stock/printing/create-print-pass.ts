import { randomBytes } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';

import { isUuid } from 'src/shared/utils/is-uuid.util';
import { filterReadableIds } from 'src/stock/stock-access';
import { readCurrentMemberId } from 'src/shared/current-member';
import { StockUserError } from 'src/stock/stock-errors';
import { PRINT_MESSAGES } from 'src/stock/printing/print-messages.constant';
import { AFTER_PRINT, OPTION_RECORDS, printableObject, printOptionsParserOf } from 'src/stock/printing/printable-objects';
import { PRINTABLES, printableKey } from 'src/stock/printing/printables';
import { recordingFinder } from 'src/stock/printing/print-rows';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type PrintPass } from 'src/stock/printing/types/print-pass.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { printPassDayKey, printPassExpiry, printPassKey } from 'src/stock/printing/utils/print-pass.util';

import 'src/stock/printing/printables/register-all';

const PASS_BYTES = 32;

// Keeps the ids the clicking user may read and stores a one-time pass for them. The print's rows are
// read once here as the user, and the pass keeps every other row they could read, so the page
// shows what the user's own screen would. `beforeStore` runs on the ids last, so a failing click
// leaves no pass behind. The pass is also filed under today's day
// key: two prints at the same instant may lose one entry there, which only leaves that unused pass
// for its expiry check to refuse.
export const createPrintPass = async (input: {
  report: PrintReportKey;
  objectSingular: string;
  recordIds: string[];
  options: Record<string, unknown>;
  timeZone: string;
  beforeStore?: (recordIds: string[]) => Promise<void>;
}): Promise<{ link: PrintLink; recordIds: string[] } | null> => {
  const objectPlural = printableObject(input.objectSingular)?.objectPlural;

  if (objectPlural === undefined) {
    return null;
  }
  const recordIds = await filterReadableIds(input.objectSingular, objectPlural, input.recordIds);

  if (recordIds.length === 0) {
    return null;
  }
  const printable = PRINTABLES.get(printableKey(input.report, input.objectSingular));

  if (printable === undefined) {
    return null;
  }
  const recorder = recordingFinder();

  await printable.read(recordIds, input.options, recorder.find);
  const rows = await recorder.rows();

  await input.beforeStore?.(recordIds);
  const now = new Date();
  const pass = randomBytes(PASS_BYTES).toString('hex');
  const stored: PrintPass = {
    report: input.report,
    objectSingular: input.objectSingular,
    recordIds,
    options: input.options,
    rows,
    timeZone: input.timeZone,
    workspaceMemberId: await readCurrentMemberId(),
    expiresAt: printPassExpiry(now),
  };
  const dayKey = printPassDayKey(now);

  await kv.set(printPassKey(pass), stored);
  await kv.set(dayKey, [...((await kv.get<string[]>(dayKey)) ?? []), pass]);

  return { link: { report: input.report, pass }, recordIds };
};

// An option that names records (a pricelist, the unfolded lines of a report) is kept only when the
// clicking user may read every one of them: the page reads them later without the user.
const checkOptionRecords = async (report: PrintReportKey, options: Record<string, unknown>) => {
  for (const [key, of] of Object.entries(OPTION_RECORDS[report] ?? {})) {
    const value = options[key];

    if (value === undefined) {
      continue;
    }
    const ids: unknown[] = Array.isArray(value) ? value : [value];
    const isIdList = ids.every(isUuid);

    if (
      !isIdList ||
      (await filterReadableIds(of.objectSingular, of.objectPlural, ids as string[])).length !== new Set(ids).size
    ) {
      throw new StockUserError(PRINT_MESSAGES.optionsNotValid);
    }
  }
};

// Every print link goes through here, asked for by a click or made by an action the user ran: the
// options must be ones the report declares and name only records the user may read, then the pass
// keeps the ids and rows the user may read.
export const createCheckedPrintPass = async (input: {
  report: string;
  objectSingular: string;
  recordIds: string[];
  options: Record<string, unknown>;
  timeZone: string;
}) => {
  const parseOptions = printOptionsParserOf(input.objectSingular, input.report);

  if (parseOptions === undefined) {
    throw new StockUserError(PRINT_MESSAGES.chooseReport);
  }
  const options = parseOptions(input.options);

  if (options === null) {
    throw new StockUserError(PRINT_MESSAGES.optionsNotValid);
  }
  const report = input.report as PrintReportKey;

  await checkOptionRecords(report, options);

  return createPrintPass({
    report,
    objectSingular: input.objectSingular,
    recordIds: input.recordIds,
    options,
    timeZone: input.timeZone,
    // Some prints change the record at the click, as marking a transfer printed does.
    beforeStore: AFTER_PRINT[report],
  });
};
