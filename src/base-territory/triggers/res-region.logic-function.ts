import { defineLogicFunction } from 'twenty-sdk/define';

import { BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/base-territory/base-territory-universal-identifiers.constant';
import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations, fsmOrders, resDistricts, resRegions } from 'src/fieldservice/fieldservice-records';

// A deleted region leaves the districts, locations, equipment and orders that name it.
const DELETE_RULES = {
  references: [
    { of: resDistricts, field: 'regionId' },
    { of: fsmLocations, field: 'regionId' },
    { of: fsmEquipments, field: 'regionId' },
    { of: fsmOrders, field: 'regionId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.resRegion,
  name: 'platform-res-region',
  description: 'Clears a deleted region from the districts, service locations, equipment and orders that name it.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(resRegions, DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'resRegion.*', batchMode: true },
});
