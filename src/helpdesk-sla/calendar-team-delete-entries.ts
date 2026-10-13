import { CALENDAR_DELETE_RULES } from 'src/resource/calendar/calendar-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted working-hours record leaves the teams that used it.
CALENDAR_DELETE_RULES.references.push({ of: records('helpdeskTicketTeam', 'helpdeskTicketTeams'), field: 'resourceCalendarId' });
