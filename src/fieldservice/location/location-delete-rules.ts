import { fsmEquipments, fsmLocationPersons, fsmLocations } from 'src/fieldservice/fieldservice-records';
import { type DeleteRules } from 'src/helpdesk/delete-rules/types/delete-rules.type';

// A deleted location leaves its sub-locations and equipment and loses its worker links. Other modules add their
// own rows at load time.
export const LOCATION_DELETE_RULES: DeleteRules = {
  references: [
    { of: fsmLocations, field: 'parentId' },
    { of: fsmEquipments, field: 'locationId' },
    { of: fsmEquipments, field: 'currentLocationId' },
  ],
  cascades: [],
  links: [{ of: fsmLocationPersons, field: 'locationId' }],
};
