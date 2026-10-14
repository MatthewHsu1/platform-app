import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_CRM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';
import { records } from 'src/shared/triggers/records';

// A deleted opportunity leaves the service orders made from it.
const LEAD_DELETE_RULES = { references: [{ of: fsmOrders, field: 'opportunityId' }], cascades: [], links: [] };

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_CRM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-crm-lead-fieldservice',
  description: 'Clears a deleted opportunity from the service orders made from it.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(records('crmLead', 'crmLeads'), LEAD_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'crmLead.*', batchMode: true },
});
