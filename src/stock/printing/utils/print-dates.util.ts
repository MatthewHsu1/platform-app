export const isTimeZone = (value: string) => {
  if (value === '') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });

    return true;
  } catch {
    return false;
  }
};

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const DEFAULT_PRINT_TIME_ZONE = 'UTC';

// The zone a print shows its dates in: the one the browser sent, else UTC.
export const printTimeZoneOf = (value: unknown) => (typeof value === 'string' && isTimeZone(value) ? value : DEFAULT_PRINT_TIME_ZONE);

// The calendar day of a moment as the reader's clock shows it, written YYYY-MM-DD. A date without a
// time (a pack date) is already a calendar day and prints as it is.
export const dayInTimeZone = (value: string | null, timeZone: string) => {
  if (value === null || value === '') {
    return '';
  }
  if (CALENDAR_DAY.test(value)) {
    return value;
  }
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') => parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
};

// A moment as the reader's clock shows it, written YYYY-MM-DD HH:MM:SS.
export const dateTimeInTimeZone = (value: string | null, timeZone: string) => {
  if (value === null || value === '') {
    return '';
  }
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
};
