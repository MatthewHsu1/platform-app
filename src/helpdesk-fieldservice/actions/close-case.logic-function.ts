import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import {
  fieldserviceRouteHandler,
  findAsUser,
  readRecordId,
  requireFieldServiceLevel,
  updateAsUser,
} from 'src/fieldservice/actions/fieldservice-action-route';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { HELPDESK_FIELDSERVICE_MESSAGES } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant';
import {
  CLOSE_CASE_ROUTE_PATH,
  HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { isOrderClosed } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';
import { planCloseCase } from 'src/helpdesk-fieldservice/utils/plan-close-case.util';
import { planCloseOffer } from 'src/helpdesk-fieldservice/utils/plan-close-offer.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

type OrderNode = { id: string; closedStatus: string | null; resolution: { markdown: string | null } | null; ticketId: string | null };
type CaseNode = { id: string; stage: { closed: boolean | null } | null };

// Closes the work case of a closed order, once every order of the case is closed. The order and the case are
// read as the clicking user (their rights and row rules apply) and the case is saved as them; the orders of the
// case are counted by the app, whose role reads every row, so a row rule cannot hide an open order from the check.
const handler = fieldserviceRouteHandler(async (body) => {
  const orderId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.user');
  const order = await findAsUser<OrderNode>('fsmOrder', 'fsmOrders', orderId, 'id closedStatus resolution { markdown } ticketId');

  if (order === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.orderNotFound, {}, 404);
  }
  const workCase =
    order.ticketId === null ? null : await findAsUser<CaseNode>('helpdeskTicket', 'helpdeskTickets', order.ticketId, 'id stage { closed }');

  if (order.ticketId !== null && workCase === null) {
    throw new FieldserviceActionError(HELPDESK_FIELDSERVICE_MESSAGES.caseNotFound, {}, 404);
  }
  const orders = workCase === null ? [] : await fsmOrders.find<{ closedStatus: string | null }>({ ticketId: { eq: workCase.id } }, 'closedStatus');
  const offer = planCloseOffer({
    orderClosed: isOrderClosed(order.closedStatus),
    orderResolution: textOrNull(order.resolution?.markdown ?? null),
    workCase: workCase === null ? null : { stageClosed: workCase.stage?.closed === true, orderClosedStatuses: orders.map((row) => row.closedStatus) },
  });

  if (offer.kind === 'refuse' || workCase === null) {
    throw new FieldserviceActionError(offer.kind === 'refuse' ? offer.reason : HELPDESK_FIELDSERVICE_MESSAGES.orderHasNoCase);
  }
  const plan = planCloseCase({
    stageId: typeof body.stageId === 'string' && body.stageId.length > 0 ? body.stageId : null,
    resolution: typeof body.resolution === 'string' ? body.resolution : '',
  });

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  await updateAsUser('helpdeskTicket', workCase.id, plan.data);

  return { caseId: workCase.id };
});

export default defineLogicFunction({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.closeCaseLogicFunction,
  name: 'close-work-case-after-service-orders',
  description: 'Moves the work case of a closed service order to the chosen stage with its resolution, once all its service orders are closed.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: CLOSE_CASE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
