import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { workIntervals } from 'src/resource/utils/work-intervals.util';

const HOUR = 3_600_000;
const WINDOW = 14 * 86_400_000;
const WINDOWS = 100;

// The moment `hours` of working time after (or, for negative hours, before) an instant. It looks two
// weeks at a time and gives up after about four years, which is a calendar without working time.
export const planHours = (data: CalendarData, hours: number, from: string, computeLeaves: boolean) => {
  const start = Date.parse(from);
  let remaining = Math.abs(hours);

  for (let window = 0; window < WINDOWS; window += 1) {
    if (hours >= 0) {
      const windowStart = start + window * WINDOW;

      for (const interval of workIntervals(data, windowStart, windowStart + WINDOW, computeLeaves)) {
        const intervalHours = (interval.stop - interval.start) / HOUR;

        if (remaining <= intervalHours) {
          return new Date(interval.start + Math.round(remaining * HOUR)).toISOString();
        }
        remaining -= intervalHours;
      }
    } else {
      const windowEnd = start - window * WINDOW;

      for (const interval of workIntervals(data, windowEnd - WINDOW, windowEnd, computeLeaves).reverse()) {
        const intervalHours = (interval.stop - interval.start) / HOUR;

        if (remaining <= intervalHours) {
          return new Date(interval.stop - Math.round(remaining * HOUR)).toISOString();
        }
        remaining -= intervalHours;
      }
    }
  }

  return null;
};
