import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations, fsmPersons, resBranches, resDistricts, resRegions } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { records } from 'src/shared/triggers/records';

// A deleted contact leaves the service locations, workers, equipment and service areas that name it.
const PERSON_DELETE_RULES = {
  references: [
    { of: fsmLocations, field: 'ownerPersonId' },
    { of: fsmLocations, field: 'partnerPersonId' },
    { of: fsmLocations, field: 'contactId' },
    { of: fsmPersons, field: 'partnerId' },
    { of: fsmEquipments, field: 'ownedByPersonId' },
    { of: fsmEquipments, field: 'managedByPersonId' },
    { of: resRegions, field: 'partnerId' },
    { of: resDistricts, field: 'partnerId' },
    { of: resBranches, field: 'partnerId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.person,
  name: 'platform-person-fieldservice',
  description: 'Clears a deleted contact from service locations, workers, equipment and service areas.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(records('person', 'people'), PERSON_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'person.*', batchMode: true },
});
