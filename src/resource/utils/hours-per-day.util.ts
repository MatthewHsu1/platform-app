import { DAY_PERIOD, WEEK_TYPE } from 'src/resource/resource-options.constant';
import { type AttendanceRow } from 'src/resource/types/attendance-row.type';

type Line = Pick<AttendanceRow, 'dayofweek' | 'hourFrom' | 'hourTo' | 'dayPeriod' | 'weekType'>;

const distinctDays = (lines: Line[]) => new Set(lines.map((line) => line.dayofweek)).size;

// The hours of a week (breaks left out) over the days worked in it. A two-week schedule averages its two
// weeks, and only lines with a week count as working days there.
export const hoursPerDay = (twoWeeksCalendar: boolean, attendances: Line[]) => {
  const working = attendances.filter((line) => line.dayPeriod !== DAY_PERIOD.LUNCH);
  const weekHours = working.reduce((sum, line) => sum + (line.hourTo - line.hourFrom), 0) / (twoWeeksCalendar ? 2 : 1);
  const days = twoWeeksCalendar
    ? (distinctDays(working.filter((line) => line.weekType === WEEK_TYPE.SECOND)) + distinctDays(working.filter((line) => line.weekType === WEEK_TYPE.FIRST))) / 2
    : distinctDays(working);

  return days === 0 ? 0 : Math.round((weekHours / days) * 100) / 100;
};
