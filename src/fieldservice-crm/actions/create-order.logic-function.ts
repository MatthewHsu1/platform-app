import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import {
  createAsUser,
  fieldserviceRouteHandler,
  findAsUser,
  readRecordId,
  requireFieldServiceLevel,
} from 'src/fieldservice/actions/fieldservice-action-route';
import {
  CREATE_ORDER_FROM_LEAD_ROUTE_PATH,
  FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';
import { planOrderFromLead } from 'src/fieldservice-crm/utils/plan-order-from-lead.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

type LeadNode = {
  id: string;
  leadType: string | null;
  fsmLocationId: string | null;
  priority: string | null;
  description: { markdown: string | null } | null;
};

// The order is made as the clicking user, so their rights apply and the order rules number it and fill its team,
// directions and request window.
const handler = fieldserviceRouteHandler(async (body) => {
  const leadId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.user');
  const lead = await findAsUser<LeadNode>('crmLead', 'crmLeads', leadId, 'id leadType fsmLocationId priority description { markdown }');

  if (lead === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.opportunityNotFound, {}, 404);
  }
  const plan = planOrderFromLead({ ...lead, description: textOrNull(lead.description?.markdown ?? null) });

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  const order = await createAsUser('fsmOrder', plan.data);

  return { orderId: order.id };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOrderLogicFunction,
  name: 'create-service-order-from-opportunity',
  description: 'Makes a service order at the service location of an opportunity, with its description and priority, linked to it.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: CREATE_ORDER_FROM_LEAD_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
