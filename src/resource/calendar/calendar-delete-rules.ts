import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';
import { resourceCalendarAttendances, resourceCalendarLeaves } from 'src/resource/resource-records';

// A deleted calendar takes its working times with it; time off that named it then counts for every calendar,
// and the teams that used it lose it (src/helpdesk-sla/calendar-team-delete-entries.ts).
export const CALENDAR_DELETE_RULES: DeleteRules = {
  references: [{ of: resourceCalendarLeaves, field: 'calendarId' }],
  cascades: [{ of: resourceCalendarAttendances, field: 'calendarId' }],
  links: [],
};
