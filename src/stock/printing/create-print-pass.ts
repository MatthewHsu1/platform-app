import { randomBytes } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';

import { filterReadableIds } from 'src/stock/stock-access';
import { readCurrentMemberId } from 'src/stock/stock-current-member';
import { printableObject } from 'src/stock/printing/printable-objects';
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
