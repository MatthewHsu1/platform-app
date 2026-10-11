import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const isoDate = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const yearlyCountDate = (today: string, month: number, requestedDay: number) => {
  const year = Number(today.slice(0, 4));
  const day = Math.min(Math.max(requestedDay, 1), lastDayOfMonth(year, month));
  const thisYear = isoDate(year, month, day);

  return thisYear > today ? thisYear : isoDate(year + 1, month, Math.min(day, lastDayOfMonth(year + 1, month)));
};

export const nextCountDate = ({
  usage,
  nextInventoryDate,
  today,
  annualInventoryMonth,
  annualInventoryDay,
}: {
  usage: LocationUsage;
  nextInventoryDate: string | null;
  today: string;
  annualInventoryMonth: number;
  annualInventoryDay: number;
}) => {
  if (usage !== LOCATION_USAGE.INTERNAL && usage !== LOCATION_USAGE.TRANSIT) {
    return null;
  }
  const yearly = annualInventoryMonth > 0 ? yearlyCountDate(today, annualInventoryMonth, annualInventoryDay) : null;

  if (nextInventoryDate !== null) {
    return yearly !== null && yearly < nextInventoryDate ? yearly : nextInventoryDate;
  }

  return yearly;
};
