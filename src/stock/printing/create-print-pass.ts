import { randomBytes } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';

import { filterReadableIds } from 'src/stock/stock-access';
import { readCurrentMemberId } from 'src/stock/stock-current-member';
import { PRINTABLE_OBJECTS } from 'src/stock/printing/printable-objects';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type PrintPass } from 'src/stock/printing/types/print-pass.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { printPassDayKey, printPassExpiry, printPassKey } from 'src/stock/printing/utils/print-pass.util';

const PASS_BYTES = 32;

// Keeps the ids the clicking user may read and stores a one-time pass for them. The pass is also
// filed under today's day key: two prints at the same instant may lose one entry there, which only
// leaves that unused pass for its expiry check to refuse.
export const createPrintPass = async (input: {
  report: PrintReportKey;
  objectSingular: string;
  recordIds: string[];
  options: Record<string, unknown>;
}): Promise<{ link: PrintLink; recordIds: string[] } | null> => {
  const objectPlural = PRINTABLE_OBJECTS[input.objectSingular]?.objectPlural;

  if (objectPlural === undefined) {
    return null;
  }
  const recordIds = await filterReadableIds(input.objectSingular, objectPlural, input.recordIds);

  if (recordIds.length === 0) {
    return null;
  }
  const now = new Date();
  const pass = randomBytes(PASS_BYTES).toString('hex');
  const stored: PrintPass = {
    report: input.report,
    objectSingular: input.objectSingular,
    recordIds,
    options: input.options,
    workspaceMemberId: await readCurrentMemberId(),
    expiresAt: printPassExpiry(now),
  };
  const dayKey = printPassDayKey(now);

  await kv.set(printPassKey(pass), stored);
  await kv.set(dayKey, [...((await kv.get<string[]>(dayKey)) ?? []), pass]);

  return { link: { report: input.report, pass }, recordIds };
};
