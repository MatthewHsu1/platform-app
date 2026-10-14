import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import {
  fsmEquipments,
  fsmLocationPersons,
  fsmOrderFsmPersonRels,
  fsmOrders,
  fsmPersonResTerritoryRels,
  fsmPersons,
  resTerritories,
} from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// A deleted worker leaves the orders, equipment and territories that name it, and loses its links for good.
const PERSON_DELETE_RULES = {
  references: [
    { of: fsmOrders, field: 'personId' },
    { of: fsmEquipments, field: 'personId' },
    { of: resTerritories, field: 'personId' },
  ],
  cascades: [],
  links: [
    { of: fsmLocationPersons, field: 'personId' },
    { of: fsmOrderFsmPersonRels, field: 'personId' },
    { of: fsmPersonResTerritoryRels, field: 'personId' },
  ],
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmPerson,
  name: 'platform-fsm-person',
  description: 'Clears a deleted field service worker from orders, equipment and territories and removes its links.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(fsmPersons, PERSON_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'fsmPerson.*', batchMode: true },
});
