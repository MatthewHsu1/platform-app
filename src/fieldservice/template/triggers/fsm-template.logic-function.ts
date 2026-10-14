import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmOrders, fsmTemplates } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// A deleted template leaves the orders that name it.
const TEMPLATE_DELETE_RULES = { references: [{ of: fsmOrders, field: 'templateId' }], cascades: [], links: [] };

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmTemplate,
  name: 'platform-fsm-template',
  description: 'Clears a deleted service order template from its orders.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(fsmTemplates, TEMPLATE_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'fsmTemplate.*', batchMode: true },
});
