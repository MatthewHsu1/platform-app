import { LOCATION_DELETE_RULES } from 'src/fieldservice/location/location-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted service location leaves the work cases, contacts and companies that name it.
LOCATION_DELETE_RULES.references.push(
  { of: records('helpdeskTicket', 'helpdeskTickets'), field: 'fsmLocationId' },
  { of: records('person', 'people'), field: 'serviceLocationId' },
  { of: records('company', 'companies'), field: 'serviceLocationId' },
);
