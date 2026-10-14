import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import {
  createAsUser,
  fieldserviceRouteHandler,
  findAsUser,
  readRecordId,
  requireFieldServiceLevel,
} from 'src/fieldservice/actions/fieldservice-action-route';
import { HELPDESK_FIELDSERVICE_MESSAGES } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant';
import {
  CREATE_ORDER_FROM_CASE_ROUTE_PATH,
  HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { planOrderFromCase } from 'src/helpdesk-fieldservice/utils/plan-order-from-case.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

type CaseNode = {
  id: string;
  priority: string | null;
  fsmLocationId: string | null;
  description: { markdown: string | null } | null;
};

// The case is read and the order made as the clicking user, so their rights and row rules apply and the order
// rules number it and fill its team, directions and request window.
const handler = fieldserviceRouteHandler(async (body) => {
  const caseId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.user');
  const workCase = await findAsUser<CaseNode>('helpdeskTicket', 'helpdeskTickets', caseId, 'id priority fsmLocationId description { markdown }');

  if (workCase === null) {
    throw new FieldserviceActionError(HELPDESK_FIELDSERVICE_MESSAGES.caseNotFound, {}, 404);
  }
  const order = await createAsUser(
    'fsmOrder',
    planOrderFromCase({ ...workCase, description: textOrNull(workCase.description?.markdown ?? null) }),
  );

  return { orderId: order.id };
});

export default defineLogicFunction({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.createOrderLogicFunction,
  name: 'create-service-order-from-work-case',
  description: 'Makes a service order for a work case, at its service location, with its priority and description, linked to it.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: CREATE_ORDER_FROM_CASE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
