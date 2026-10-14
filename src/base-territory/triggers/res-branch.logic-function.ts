import { defineLogicFunction } from 'twenty-sdk/define';

import { BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/base-territory/base-territory-universal-identifiers.constant';
import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations, fsmOrders, resBranches, resTerritories } from 'src/fieldservice/fieldservice-records';

// A deleted branch leaves the territories, locations, equipment and orders that name it.
const DELETE_RULES = {
  references: [
    { of: resTerritories, field: 'branchId' },
    { of: fsmLocations, field: 'branchId' },
    { of: fsmEquipments, field: 'branchId' },
    { of: fsmOrders, field: 'branchId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.resBranch,
  name: 'platform-res-branch',
  description: 'Clears a deleted branch from the territories, service locations, equipment and orders that name it.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(resBranches, DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'resBranch.*', batchMode: true },
});
