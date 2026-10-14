import { defineLogicFunction } from 'twenty-sdk/define';

import { BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/base-territory/base-territory-universal-identifiers.constant';
import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations, fsmOrders, fsmPersonResTerritoryRels, resTerritories } from 'src/fieldservice/fieldservice-records';

// A deleted territory leaves the locations, equipment and orders that name it and loses its worker links for good.
const DELETE_RULES = {
  references: [
    { of: fsmLocations, field: 'territoryId' },
    { of: fsmEquipments, field: 'territoryId' },
    { of: fsmOrders, field: 'territoryId' },
  ],
  cascades: [],
  links: [{ of: fsmPersonResTerritoryRels, field: 'territoryId' }],
};

export default defineLogicFunction({
  universalIdentifier: BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.resTerritory,
  name: 'platform-res-territory',
  description: 'Clears a deleted territory from the service locations, equipment and orders that name it.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(resTerritories, DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'resTerritory.*', batchMode: true },
});
