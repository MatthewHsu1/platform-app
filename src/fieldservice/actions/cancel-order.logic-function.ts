import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { fieldserviceRouteHandler, findAsUser, readRecordId, requireFieldServiceLevel, updateAsUser } from 'src/fieldservice/actions/fieldservice-action-route';
import { planCancelOrder } from 'src/fieldservice/actions/utils/plan-cancel-order.util';
import { CANCEL_ORDER_ROUTE_PATH, FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// Cancelling is an ordinary stage change, so it goes in as the clicking user and the order rules treat it as theirs.
const handler = fieldserviceRouteHandler(async (body) => {
  const orderId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.dispatcher');
  const order = await findAsUser<{ id: string; closedStatus: string | null }>('fsmOrder', 'fsmOrders', orderId, 'id closedStatus');

  if (order === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.orderNotFound, {}, 404);
  }
  const plan = planCancelOrder(order);

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  await updateAsUser('fsmOrder', orderId, plan.data);

  return { orderId };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.cancelLogicFunction,
  name: 'cancel-service-order',
  description: 'Moves an open service order to Cancelled.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: CANCEL_ORDER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
