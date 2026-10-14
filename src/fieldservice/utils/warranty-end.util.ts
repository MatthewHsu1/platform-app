import { type WarrantyInput } from 'src/fieldservice/types/warranty-input.type';
import { addMonths } from 'src/stock/orderpoint/utils/day.util';

const MILLISECONDS_PER_DAY = 86_400_000;

// The warranty end is calendar arithmetic in UTC: days and weeks shift the
// date, months and years shift the calendar month and the day clamps to the
// last day of that month (31 Jan plus one month is 28 Feb). An end before the
// start (a zero or negative length) clamps to the start.
export const warrantyEnd = (
  startIso: WarrantyInput['startIso'],
  length: WarrantyInput['length'],
  unit: WarrantyInput['unit'],
): string => {
  const start = new Date(startIso);
  const end = new Date(start.getTime());
  if (unit === 'day' || unit === 'week') {
    end.setTime(end.getTime() + length * (unit === 'week' ? 7 : 1) * MILLISECONDS_PER_DAY);
  } else {
    const canonicalStart = start.toISOString();
    const shifted = addMonths(canonicalStart.slice(0, 10), length * (unit === 'year' ? 12 : 1));
    end.setTime(new Date(`${shifted}${canonicalStart.slice(10)}`).getTime());
  }
  if (end.getTime() < start.getTime()) {
    return start.toISOString();
  }
  return end.toISOString();
};
