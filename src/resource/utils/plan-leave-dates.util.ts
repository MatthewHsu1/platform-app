import { RESOURCE_MESSAGES } from 'src/resource/resource-messages.constant';
import { localToUtc, utcToLocal } from 'src/resource/utils/time-zone.util';

const endOfLocalDay = (instant: number, timeZone: string) => {
  const local = utcToLocal(instant, timeZone);

  return localToUtc({ ...local, hour: 23, minute: 59, second: 59 }, timeZone);
};

type LeaveDatesPlan = { kind: 'write'; data: { dateFrom?: string; dateTo?: string } } | { kind: 'refuse'; reason: string };

// The dates of a time off after a save. A new time off with no dates covers today in the standard working
// hours' zone. An end that is empty, or not after a start saved without it, becomes the last second of the start's
// day in the saver's zone. A start after the end is refused.
export const planLeaveDates = ({
  operation,
  dateFrom,
  dateTo,
  written,
  memberTimeZone,
  standardTimeZone,
  now,
}: {
  operation: 'created' | 'updated';
  dateFrom: string | null;
  dateTo: string | null;
  written: ReadonlySet<string>;
  memberTimeZone: string | null;
  standardTimeZone: string | null;
  now: string;
}): LeaveDatesPlan => {
  const data: { dateFrom?: string; dateTo?: string } = {};
  let from = dateFrom === null ? null : Date.parse(dateFrom);
  let to = dateTo === null ? null : Date.parse(dateTo);

  if (operation === 'created' && from === null && to === null) {
    const zone = standardTimeZone ?? 'UTC';
    const today = new Date(now);
    const day = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() };

    from = localToUtc({ ...day, hour: 0, minute: 0, second: 0, millisecond: 0 }, zone);
    to = localToUtc({ ...day, hour: 23, minute: 59, second: 59, millisecond: 999 }, zone);
    data.dateFrom = new Date(from).toISOString();
    data.dateTo = new Date(to).toISOString();
  } else if (from !== null && (written.has('dateFrom') || operation === 'created') && !written.has('dateTo') && (to === null || to <= from)) {
    to = endOfLocalDay(from, memberTimeZone ?? standardTimeZone ?? 'UTC');
    data.dateTo = new Date(to).toISOString();
  }

  if (from !== null && to !== null && from > to) {
    return { kind: 'refuse', reason: RESOURCE_MESSAGES.leaveOrderRefusal };
  }

  return { kind: 'write', data };
};
