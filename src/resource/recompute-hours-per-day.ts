import { resourceCalendarAttendances, resourceCalendars } from 'src/resource/resource-records';
import { type AttendanceRow } from 'src/resource/types/attendance-row.type';
import { hoursPerDay } from 'src/resource/utils/hours-per-day.util';

type LineNode = Pick<AttendanceRow, 'dayofweek' | 'hourFrom' | 'hourTo' | 'dayPeriod' | 'weekType'> & { calendarId: string };

// The one writer of a calendar's average hours per day, from its working times. It writes only a change.
export const recomputeHoursPerDay = async (calendarIds: string[]) => {
  const ids = [...new Set(calendarIds)];

  if (ids.length === 0) {
    return;
  }
  const calendars = await resourceCalendars.find<{ id: string; hoursPerDay: number | null; twoWeeksCalendar: boolean | null }>(
    { id: { in: ids } },
    'id hoursPerDay twoWeeksCalendar',
  );
  const lines = await resourceCalendarAttendances.find<LineNode>({ calendarId: { in: ids } }, 'calendarId dayofweek hourFrom hourTo dayPeriod weekType');

  for (const calendar of calendars) {
    const average = hoursPerDay(
      calendar.twoWeeksCalendar === true,
      lines.filter((line) => line.calendarId === calendar.id),
    );

    if ((calendar.hoursPerDay ?? 0) !== average) {
      await resourceCalendars.update(calendar.id, { hoursPerDay: average });
    }
  }
};
