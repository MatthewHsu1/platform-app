import { WARRANTY_UNIT } from 'src/fieldservice/fieldservice-options.constant';
import { type WarrantyInput } from 'src/fieldservice/types/warranty-input.type';
import { warrantyEnd } from 'src/fieldservice/utils/warranty-end.util';

const UNITS: Record<string, WarrantyInput['unit']> = {
  [WARRANTY_UNIT.DAY]: 'day',
  [WARRANTY_UNIT.WEEK]: 'week',
  [WARRANTY_UNIT.MONTH]: 'month',
  [WARRANTY_UNIT.YEAR]: 'year',
};

// The warranty ends the warranty length after its start; without a length it ends today. Without a start there
// is nothing to count from, and null means the end stays as it is. Dates are calendar days.
export const planWarrantyEnd = ({
  startDate,
  length,
  unit,
  today,
}: {
  startDate: string | null;
  length: number;
  unit: string | null;
  today: string;
}): string | null => {
  if (length <= 0) {
    return today;
  }
  if (startDate === null) {
    return null;
  }
  return warrantyEnd(`${startDate}T00:00:00.000Z`, length, UNITS[unit ?? WARRANTY_UNIT.DAY] ?? 'day').slice(0, 10);
};

// The warranty end may not come before its start.
export const warrantyDatesValid = (startDate: string | null, endDate: string | null) =>
  startDate === null || endDate === null || endDate >= startDate;
