import { type WarrantyInput } from 'src/fieldservice/types/warranty-input.type';

const MILLISECONDS_PER_DAY = 86_400_000;

// The warranty end is calendar arithmetic in UTC: days and weeks shift the
// date, months and years shift the calendar month. An end before the start
// (a zero or negative length) clamps to the start.
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
    end.setUTCMonth(end.getUTCMonth() + length * (unit === 'year' ? 12 : 1));
  }
  if (end.getTime() < start.getTime()) {
    return start.toISOString();
  }
  return end.toISOString();
};
