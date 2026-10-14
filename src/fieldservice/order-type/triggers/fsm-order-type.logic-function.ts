import { defineLogicFunction } from 'twenty-sdk/define';

import { deleteRulesHandler } from 'src/fieldservice/delete-rules-handler';
import { fsmOrders, fsmOrderTypes, fsmTemplates } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// A deleted type leaves the orders and templates that name it.
const ORDER_TYPE_DELETE_RULES = {
  references: [
    { of: fsmOrders, field: 'orderTypeId' },
    { of: fsmTemplates, field: 'orderTypeId' },
  ],
  cascades: [],
  links: [],
};

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmOrderType,
  name: 'platform-fsm-order-type',
  description: 'Clears a deleted service order type from its orders and templates.',
  timeoutSeconds: 120,
  handler: deleteRulesHandler(fsmOrderTypes, ORDER_TYPE_DELETE_RULES),
  databaseEventTriggerSettings: { eventName: 'fsmOrderType.*', batchMode: true },
});
