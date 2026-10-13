import { type LocalDateTime } from 'src/resource/types/local-date-time.type';

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR = 3_600_000;

const formatterFor = (timeZone: string) => {
  let formatter = FORMATTERS.get(timeZone);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
};

export const isKnownTimeZone = (timeZone: string) => {
  if (timeZone === '') {
    return false;
  }
  try {
    formatterFor(timeZone);

    return true;
  } catch {
    return false;
  }
};

// The wall time and weekday (Monday is 0) of an instant in a zone.
export const utcToLocal = (instant: number, timeZone: string): LocalDateTime & { weekday: number } => {
  const parts = formatterFor(timeZone).formatToParts(new Date(instant));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')) % 24,
    minute: Number(read('minute')),
    second: Number(read('second')),
    millisecond: ((instant % 1000) + 1000) % 1000,
    weekday: WEEKDAYS.indexOf(read('weekday')),
  };
};

const offsetAt = (instant: number, timeZone: string) => {
  const local = utcToLocal(instant, timeZone);

  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond) - instant;
};

// A wall time may exist once, twice (clocks go back) or never (clocks go forward). Twice or never, the
// winter offset is taken, as working-hours scheduling has always done.
export const localToUtc = (local: LocalDateTime, timeZone: string) => {
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
  const offsets = [...new Set([offsetAt(asUtc - 12 * HOUR, timeZone), offsetAt(asUtc + 12 * HOUR, timeZone)])];
  const valid = offsets.filter((offset) => offsetAt(asUtc - offset, timeZone) === offset);
  const chosen = valid.length === 1 ? valid[0] : Math.min(...offsets);

  return asUtc - chosen;
};
