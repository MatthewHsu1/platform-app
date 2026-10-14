import { fsmLocations, fsmPersons } from 'src/fieldservice/fieldservice-records';
import { CALENDAR_DELETE_RULES } from 'src/resource/calendar/calendar-delete-rules';

// A deleted working-hours record leaves the service locations and workers that use it.
CALENDAR_DELETE_RULES.references.push({ of: fsmLocations, field: 'calendarId' }, { of: fsmPersons, field: 'calendarId' });
