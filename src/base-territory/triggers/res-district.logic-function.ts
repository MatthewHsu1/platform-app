import { defineLogicFunction } from 'twenty-sdk/define';

import { BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/base-territory/base-territory-universal-identifiers.constant';
import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations, fsmOrders, resBranches, resDistricts } from 'src/fieldservice/fieldservice-records';

// A deleted district leaves the branches, locations, equipment and orders that name it.
const DELETE_RULES = {
  references: [
    { of: resBranches, field: 'districtId' },
    { of: fsmLocations, field: 'districtId' },
    { of: fsmEquipments, field: 'districtId' },
    { of: fsmOrders, field: 'districtId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.resDistrict,
  name: 'platform-res-district',
  description: 'Clears a deleted district from the branches, service locations, equipment and orders that name it.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(resDistricts, DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'resDistrict.*', batchMode: true },
});
