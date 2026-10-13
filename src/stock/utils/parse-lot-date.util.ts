import { type DateOrder } from 'src/stock/utils/types/date-order.type';

type DateParts = { year: number | null; month: number | null; day: number | null };

const MONTH_NAMES: string[][] = [
  ['jan', 'january'],
  ['feb', 'february'],
  ['mar', 'march'],
  ['apr', 'april'],
  ['may'],
  ['jun', 'june'],
  ['jul', 'july'],
  ['aug', 'august'],
  ['sep', 'sept', 'september'],
  ['oct', 'october'],
  ['nov', 'november'],
  ['dec', 'december'],
];

const DATE_SEPARATORS = /[\s\-/.,]+/;

const GUESS_SEPARATORS = /[-/ ]+/;

const HAS_LETTER = /[a-zA-Z]/;

export const toDateOrder = (workspaceMemberDateFormat: string | null): DateOrder =>
  workspaceMemberDateFormat === 'DAY_FIRST' || workspaceMemberDateFormat === 'YEAR_FIRST'
    ? workspaceMemberDateFormat
    : 'MONTH_FIRST';

const monthFromName = (token: string) => {
  const lower = token.toLowerCase();
  const index = MONTH_NAMES.findIndex((names) => names.includes(lower));

  return index === -1 ? null : index + 1;
};

const wholeNumber = (text: string) => (/^\d+$/.test(text) ? Number(text) : null);

// A two-digit year lands within 50 years of today, as people write them.
const fullYear = (year: number, today: Date) => {
  const currentYear = today.getUTCFullYear();
  const candidate = year + Math.floor(currentYear / 100) * 100;

  if (candidate >= currentYear + 50) {
    return candidate - 100;
  }
  return candidate < currentYear - 50 ? candidate + 100 : candidate;
};

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const pad = (value: number, size: number) => String(value).padStart(size, '0');

// Which value is the year, the month and the day. A month written in letters
// and a number of three digits or more (a year) are known; the rest is read
// from the values themselves (above 31 only a year, above 12 not a month)
// before the user's order breaks a tie.
const resolveParts = (
  values: number[],
  monthIndex: number | null,
  yearIndex: number | null,
  order: DateOrder,
): DateParts => {
  const dayFirst = order === 'DAY_FIRST';
  const yearFirst = order === 'YEAR_FIRST';
  const known = (monthIndex === null ? 0 : 1) + (yearIndex === null ? 0 : 1);
  const at = (index: number | null) => (index === null ? null : values[index]);

  if (values.length === known) {
    return { year: at(yearIndex), month: at(monthIndex), day: null };
  }
  if (values.length === 3 && known === 2) {
    const dayIndex = [0, 1, 2].find((index) => index !== monthIndex && index !== yearIndex) ?? null;

    return { year: at(yearIndex), month: at(monthIndex), day: at(dayIndex) };
  }

  if (values.length === 1 || (monthIndex !== null && values.length === 2)) {
    const other = monthIndex === null ? values[0] : values[1 - monthIndex];

    return other > 31
      ? { year: other, month: at(monthIndex), day: null }
      : { year: null, month: at(monthIndex), day: other };
  }

  const [first, second, third] = values;

  if (values.length === 2) {
    if (first > 31) {
      return { year: first, month: second, day: null };
    }
    if (second > 31) {
      return { year: second, month: first, day: null };
    }
    return dayFirst && second <= 12
      ? { year: null, month: second, day: first }
      : { year: null, month: first, day: second };
  }

  if (monthIndex === 0) {
    return second > 31
      ? { year: second, month: first, day: third }
      : { year: third, month: first, day: second };
  }
  if (monthIndex === 1) {
    return first > 31 || (yearFirst && third <= 31)
      ? { year: first, month: second, day: third }
      : { year: third, month: second, day: first };
  }
  if (monthIndex === 2) {
    return second > 31
      ? { year: second, month: third, day: first }
      : { year: first, month: third, day: second };
  }
  if (first > 31 || yearIndex === 0 || (yearFirst && second <= 12 && third <= 31)) {
    return dayFirst && third <= 12
      ? { year: first, month: third, day: second }
      : { year: first, month: second, day: third };
  }
  return first > 12 || (dayFirst && second <= 12)
    ? { year: third, month: second, day: first }
    : { year: third, month: first, day: second };
};

// Reads numbers and English month names split by spaces, '-', '/', '.' or
// ','. A missing year or month is today's; a missing day is today's, or the
// month's last day when the month is shorter.
export const parseLotDate = (text: string, order: DateOrder, today: Date): string | null => {
  const tokens = text
    .trim()
    .split(DATE_SEPARATORS)
    .filter((token) => token.length > 0);
  const values: number[] = [];
  let monthIndex: number | null = null;
  let yearIndex: number | null = null;

  for (const token of tokens) {
    const number = wholeNumber(token);

    if (number !== null) {
      if (token.length > 2) {
        if (yearIndex !== null) {
          return null;
        }
        yearIndex = values.length;
      }
      values.push(number);
      continue;
    }
    const month = monthFromName(token);

    if (month === null || monthIndex !== null) {
      return null;
    }
    monthIndex = values.length;
    values.push(month);
  }

  if (values.length === 0 || values.length > 3) {
    return null;
  }
  const parts = resolveParts(values, monthIndex, yearIndex, order);
  const year =
    parts.year === null
      ? today.getUTCFullYear()
      : parts.year < 100 && yearIndex === null
        ? fullYear(parts.year, today)
        : parts.year;
  const month = parts.month ?? today.getUTCMonth() + 1;

  if (year < 1 || year > 9999 || month < 1 || month > 12) {
    return null;
  }
  const lastDay = daysInMonth(year, month);
  const day = parts.day ?? Math.min(today.getUTCDate(), lastDay);

  if (day < 1 || day > lastDay) {
    return null;
  }

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T00:00:00.000Z`;
};

// The first pasted date that shows its order decides it for the whole paste:
// a first value above 31 is a year, above 12 (before a month or a value up
// to 12) a day. Otherwise the user's own order holds; month-first and a month
// written first stay undecided so a later row may still show its order.
export const guessDateOrder = (columns: string[], userOrder: DateOrder): DateOrder | null => {
  for (const column of columns) {
    const values = column.split(GUESS_SEPARATORS).filter((value) => value.length > 0);

    if (values.length < 2) {
      continue;
    }
    const [first, second] = values;

    if (HAS_LETTER.test(first)) {
      return null;
    }
    const firstNumber = wholeNumber(first);

    if (firstNumber === null) {
      continue;
    }
    if (firstNumber > 31) {
      return 'YEAR_FIRST';
    }
    if (firstNumber > 12 && (HAS_LETTER.test(second) || (wholeNumber(second) ?? 13) <= 12)) {
      return 'DAY_FIRST';
    }
    return userOrder === 'MONTH_FIRST' ? null : userOrder;
  }

  return null;
};
