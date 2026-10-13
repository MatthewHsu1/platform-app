import { RESOURCE_MESSAGES } from 'src/resource/resource-messages.constant';
import { isKnownTimeZone } from 'src/resource/utils/time-zone.util';

type StandardLine = {
  name: string | null;
  dayofweek: string;
  hourFrom: number;
  hourTo: number;
  dayPeriod: string;
  weekType: string | null;
  sequence: number;
};

type StandardCalendar = { id: string; tz: string; twoWeeksCalendar: boolean; lines: StandardLine[] };

// A new working-hours record that has no working times of its own starts as a copy of the standard one
// (its working times, time zone and two-week flag). Otherwise an empty time zone takes the default zone, and
// a zone that does not exist is refused.
export const planCalendarCreate = ({
  calendar,
  standard,
  defaultTimeZone,
}: {
  calendar: { id: string; tz: string | null; seedKey: string | null; lineCount: number };
  standard: StandardCalendar | null;
  defaultTimeZone: string;
}) => {
  if (calendar.tz !== null && calendar.tz !== '' && !isKnownTimeZone(calendar.tz)) {
    return { kind: 'refuse' as const, reason: RESOURCE_MESSAGES.timeZoneRefusal };
  }
  if (calendar.seedKey === null && calendar.lineCount === 0 && standard !== null && standard.id !== calendar.id) {
    return {
      kind: 'write' as const,
      data: { tz: standard.tz, twoWeeksCalendar: standard.twoWeeksCalendar },
      lines: standard.lines.map((line) => ({ ...line, calendarId: calendar.id })),
    };
  }

  return { kind: 'write' as const, data: calendar.tz === null || calendar.tz === '' ? { tz: defaultTimeZone } : {}, lines: [] };
};
