import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmEquipments, fsmLocations } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { records } from 'src/shared/triggers/records';

// A deleted company leaves the service locations and equipment that name it.
const COMPANY_DELETE_RULES = {
  references: [
    { of: fsmLocations, field: 'ownerCompanyId' },
    { of: fsmLocations, field: 'partnerCompanyId' },
    { of: fsmEquipments, field: 'ownedByCompanyId' },
    { of: fsmEquipments, field: 'managedByCompanyId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.company,
  name: 'platform-company-fieldservice',
  description: 'Clears a deleted company from service locations and equipment.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(records('company', 'companies'), COMPANY_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'company.*', batchMode: true },
});
