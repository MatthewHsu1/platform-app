import { defineLogicFunction } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmLocations } from 'src/fieldservice/fieldservice-records';
import { records } from 'src/shared/triggers/records';

// A deleted contact leaves the shipping address of the service locations that name it.
const PERSON_DELETE_RULES = { references: [{ of: fsmLocations, field: 'shippingAddressPersonId' }], cascades: [], links: [] };

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.person,
  name: 'platform-person-fieldservice-stock',
  description: 'Clears a deleted contact from the shipping address of service locations.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(records('person', 'people'), PERSON_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'person.deleted', batchMode: true },
});
