import { STANDARD_CALENDAR_SEED_KEY } from 'src/resource/resource-options.constant';
import { resourceCalendarAttendances, resourceCalendarLeaves, resourceCalendars } from 'src/resource/resource-records';
import { type AttendanceRow } from 'src/resource/types/attendance-row.type';
import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { type LeaveRow } from 'src/resource/types/leave-row.type';
import { findMany } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';

const UTC = 'UTC';
// Calendar ids go to the API in parts so one request stays short.
const IDS_PER_REQUEST = 100;

type CalendarNode = { id: string; name: string | null; tz: string | null; hoursPerDay: number | null; twoWeeksCalendar: boolean | null; active: boolean | null };
type AttendanceNode = {
  id: string;
  calendarId: string;
  name: string | null;
  dayofweek: string | null;
  hourFrom: number | null;
  hourTo: number | null;
  dayPeriod: string | null;
  weekType: string | null;
  sequence: number | null;
};
type LeaveNode = { id: string; calendarId: string | null; dateFrom: string | null; dateTo: string | null; timeType: string | null };

// The working hours with their working times and the time off that counts for them (their own and the time
// off that names no calendar), read with the app token. A calendar without a time zone reads as UTC: an empty
// zone must not break a deadline.
export const loadCalendars = async (calendarIds: string[]): Promise<Map<string, CalendarData>> => {
  const ids = [...new Set(calendarIds)];
  const result = new Map<string, CalendarData>();

  if (ids.length === 0) {
    return result;
  }
  const sharedLeaves = await resourceCalendarLeaves.find<LeaveNode>({ calendarId: { is: 'NULL' } }, 'id calendarId dateFrom dateTo timeType');

  for (const part of chunks(ids, IDS_PER_REQUEST)) {
    // Twenty refuses the same list twice in one request, so the time off of no calendar is read on its own.
    const found = await findMany<{ calendars: CalendarNode[]; attendances: AttendanceNode[]; leaves: LeaveNode[] }>({
      calendars: { of: resourceCalendars, filter: { id: { in: part } }, selection: 'id name tz hoursPerDay twoWeeksCalendar active' },
      attendances: {
        of: resourceCalendarAttendances,
        filter: { calendarId: { in: part } },
        selection: 'id calendarId name dayofweek hourFrom hourTo dayPeriod weekType sequence',
      },
      leaves: { of: resourceCalendarLeaves, filter: { calendarId: { in: part } }, selection: 'id calendarId dateFrom dateTo timeType' },
    });
    for (const calendar of found.calendars) {
      const attendances: AttendanceRow[] = found.attendances
        .filter((line) => line.calendarId === calendar.id)
        .map((line) => ({
          id: line.id,
          calendarId: line.calendarId,
          name: line.name,
          dayofweek: line.dayofweek ?? '',
          hourFrom: line.hourFrom ?? 0,
          hourTo: line.hourTo ?? 0,
          dayPeriod: line.dayPeriod ?? '',
          weekType: line.weekType,
          sequence: line.sequence ?? 0,
        }));
      const leaves: LeaveRow[] = [...found.leaves.filter((leave) => leave.calendarId === calendar.id), ...sharedLeaves].flatMap((leave) =>
        leave.dateFrom === null || leave.dateTo === null
          ? []
          : [{ id: leave.id, calendarId: leave.calendarId, dateFrom: leave.dateFrom, dateTo: leave.dateTo, timeType: leave.timeType ?? '' }],
      );

      result.set(calendar.id, {
        calendar: {
          id: calendar.id,
          name: calendar.name,
          tz: calendar.tz === null || calendar.tz === '' ? UTC : calendar.tz,
          hoursPerDay: calendar.hoursPerDay ?? 0,
          twoWeeksCalendar: calendar.twoWeeksCalendar === true,
          active: calendar.active !== false,
        },
        attendances,
        leaves,
      });
    }
  }

  return result;
};

export const findStandardCalendarId = async () => {
  const [standard] = await resourceCalendars.find<{ id: string }>({ seedKey: { eq: STANDARD_CALENDAR_SEED_KEY } }, 'id');

  return standard?.id ?? null;
};
