import { DAY_OF_WEEK } from 'src/resource/resource-options.constant';
import { type AttendanceRow } from 'src/resource/types/attendance-row.type';
import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { type LeaveRow } from 'src/resource/types/leave-row.type';

const DAY_NAMES = Object.values(DAY_OF_WEEK);

let next = 0;

// Days are numbered from Monday = 0.
const line = (calendarId: string, hourFrom: number, hourTo: number, day: number, weekType: string | null = null, dayPeriod = 'MORNING'): AttendanceRow => {
  next += 1;

  return { id: `${calendarId}-${next}`, calendarId, name: `${calendarId} ${next}`, dayofweek: DAY_NAMES[day], hourFrom, hourTo, dayPeriod, weekType, sequence: 10 };
};

export const calendar = (id: string, tz: string, attendances: AttendanceRow[], leaves: LeaveRow[] = [], twoWeeksCalendar = false): CalendarData => ({
  calendar: { id, name: id, tz, hoursPerDay: 8, twoWeeksCalendar, active: true },
  attendances,
  leaves,
});

const WEEKDAYS = [0, 1, 2, 3, 4];

// Four working calendars of different shapes and zones.
export const JEAN = (leaves: LeaveRow[] = []) => calendar('jean', 'Europe/Brussels', WEEKDAYS.map((day) => line('jean', 8, 16, day)), leaves);

export const PATEL = (leaves: LeaveRow[] = []) =>
  calendar('patel', 'Etc/GMT-6', WEEKDAYS.flatMap((day) => [line('patel', 9, 12, day), line('patel', 13, 17, day)]), leaves);

export const JOHN = () => calendar('john', 'America/Los_Angeles', [line('john', 8, 16, 1), line('john', 8, 13, 4), line('john', 16, 23, 4)]);

export const JULES = (leaves: LeaveRow[] = []) =>
  calendar(
    'jules',
    'Europe/Brussels',
    [
      line('jules', 8, 16, 0, 'FIRST'),
      line('jules', 9, 17, 1, 'FIRST'),
      line('jules', 8, 16, 0, 'SECOND'),
      line('jules', 7, 15, 2, 'SECOND'),
      line('jules', 8, 16, 3, 'SECOND'),
      line('jules', 10, 16, 4, 'SECOND'),
    ],
    leaves,
    true,
  );

export const STANDARD_LINES = (calendarId: string) =>
  WEEKDAYS.flatMap((day) => [
    line(calendarId, 8, 12, day, null, 'MORNING'),
    line(calendarId, 12, 13, day, null, 'LUNCH'),
    line(calendarId, 13, 17, day, null, 'AFTERNOON'),
  ]);

export const leave = (calendarId: string | null, dateFrom: string, dateTo: string, timeType = 'LEAVE'): LeaveRow => {
  next += 1;

  return { id: `leave-${next}`, calendarId, dateFrom, dateTo, timeType };
};

export const at = (iso: string) => Date.parse(iso);

// A line for tests that build their own lines: the day is a weekday name.
export const extraLine = (hourFrom: number, hourTo: number, dayofweek: string, weekType: string | null = null) => ({
  id: 'x',
  dayofweek,
  hourFrom,
  hourTo,
  weekType,
});
