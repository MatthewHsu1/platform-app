import { DAY_OF_WEEK_INDEX, DAY_PERIOD, LEAVE_TIME_TYPE, WEEK_TYPE } from 'src/resource/resource-options.constant';
import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { type TimeInterval } from 'src/resource/types/time-interval.type';
import { floatToTime } from 'src/resource/utils/float-to-time.util';
import { normalizeIntervals, subtractIntervals } from 'src/resource/utils/intervals.util';
import { localToUtc, utcToLocal } from 'src/resource/utils/time-zone.util';
import { weekType } from 'src/resource/utils/week-type.util';

const DAY = 86_400_000;

// Every working line of every local day the request touches, clipped to the request. A line without a week
// counts as the first week.
export const attendanceIntervals = ({ calendar, attendances }: CalendarData, start: number, end: number) => {
  if (end <= start) {
    return [];
  }
  const lines = attendances.filter((line) => line.dayPeriod !== DAY_PERIOD.LUNCH);
  const first = utcToLocal(start, calendar.tz);
  const last = utcToLocal(end, calendar.tz);
  const intervals: TimeInterval[] = [];

  for (let day = Date.UTC(first.year, first.month - 1, first.day) - DAY; day <= Date.UTC(last.year, last.month - 1, last.day) + DAY; day += DAY) {
    const date = new Date(day);
    const local = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
    const weekday = (date.getUTCDay() + 6) % 7;
    const week = weekType(local) === 1 ? WEEK_TYPE.SECOND : WEEK_TYPE.FIRST;

    for (const line of lines) {
      const lineWeek = line.weekType ?? WEEK_TYPE.FIRST;

      if (DAY_OF_WEEK_INDEX[line.dayofweek] !== weekday || (calendar.twoWeeksCalendar && lineWeek !== week)) {
        continue;
      }
      const from = localToUtc({ ...local, ...floatToTime(line.hourFrom) }, calendar.tz);
      const to = localToUtc({ ...local, ...floatToTime(line.hourTo) }, calendar.tz);

      intervals.push({ start: Math.max(from, start), stop: Math.min(to, end) });
    }
  }

  return normalizeIntervals(intervals);
};

// Only time off of the kind "Time off" counts, of this calendar or of no calendar.
export const leaveIntervals = ({ calendar, leaves }: CalendarData, start: number, end: number) =>
  normalizeIntervals(
    leaves
      .filter((leave) => leave.timeType === LEAVE_TIME_TYPE.LEAVE && (leave.calendarId === null || leave.calendarId === calendar.id))
      .map((leave) => ({ from: Date.parse(leave.dateFrom), to: Date.parse(leave.dateTo) }))
      .filter(({ from, to }) => from <= end && to >= start)
      .map(({ from, to }) => ({ start: Math.max(from, start), stop: Math.min(to, end) })),
  );

export const workIntervals = (data: CalendarData, start: number, end: number, computeLeaves: boolean) => {
  const attendance = attendanceIntervals(data, start, end);

  return computeLeaves ? subtractIntervals(attendance, leaveIntervals(data, start, end)) : attendance;
};
