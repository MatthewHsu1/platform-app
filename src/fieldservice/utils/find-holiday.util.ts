import { type HolidayRow } from 'src/fieldservice/types/holiday-row.type';

// A time off lying wholly inside the scheduled window makes the start a holiday. Every time off counts, whatever
// working hours it belongs to; a window without an end holds none.
export const findHoliday = (startIso: string | null, endIso: string | null, holidays: HolidayRow[]): HolidayRow | null => {
  if (startIso === null || endIso === null) {
    return null;
  }
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  return (
    holidays.find(
      (holiday) =>
        holiday.dateFrom !== null && holiday.dateTo !== null && Date.parse(holiday.dateFrom) >= start && Date.parse(holiday.dateTo) <= end,
    ) ?? null
  );
};
