import { kv } from 'twenty-sdk/logic-function';

import { type PrintPass } from 'src/stock/printing/types/print-pass.type';
import { isPrintPassLive, printPassKey, stalePrintPassDayKeys } from 'src/stock/printing/utils/print-pass.util';

// Removes print links nobody opened. A link made in the last minutes before midnight may still
// be live: it stays listed under its day, and a later night clears it.
export const clearPrintPasses = async (now: Date) => {
  for (const dayKey of stalePrintPassDayKeys(now)) {
    const passes = await kv.get<string[]>(dayKey);

    if (passes === null) {
      continue;
    }
    const live: string[] = [];

    for (const pass of passes) {
      const stored = await kv.get<PrintPass>(printPassKey(pass));

      if (stored === null) {
        continue;
      }
      if (isPrintPassLive(stored, now)) {
        live.push(pass);
      } else {
        await kv.delete(printPassKey(pass));
      }
    }
    await (live.length === 0 ? kv.delete(dayKey) : kv.set(dayKey, live));
  }
};
