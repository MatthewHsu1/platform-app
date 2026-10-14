import { LOCATION_DELETE_RULES } from 'src/fieldservice/location/location-delete-rules';
import { records } from 'src/shared/triggers/records';

// A deleted service location leaves the opportunities that name it.
LOCATION_DELETE_RULES.references.push({ of: records('crmLead', 'crmLeads'), field: 'fsmLocationId' });
