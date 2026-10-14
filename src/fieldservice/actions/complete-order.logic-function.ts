import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { fieldserviceRouteHandler, findAsUser, readRecordId, requireFieldServiceLevel } from 'src/fieldservice/actions/fieldservice-action-route';
import { planCompleteOrder } from 'src/fieldservice/actions/utils/plan-complete-order.util';
import { ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { COMPLETE_ORDER_ROUTE_PATH, FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { STAGE_RULE_VALUES_SELECTION } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { requireStageFields } from 'src/fieldservice-stage-validation/require-stage-fields';

// The only way to Completed: the order is read as the clicking user (their rights and level checked), checked
// against the fields the Completed stage needs, then written by the app, whose writes the stage guard lets through.
const handler = fieldserviceRouteHandler(async (body) => {
  const orderId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.user');
  const order = await findAsUser<Record<string, unknown> & { id: string; closedStatus: string | null; dateStart: string | null }>(
    'fsmOrder',
    'fsmOrders',
    orderId,
    `id closedStatus dateStart ${STAGE_RULE_VALUES_SELECTION}`,
  );

  if (order === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.orderNotFound, {}, 404);
  }
  const plan = planCompleteOrder(order, new Date().toISOString());

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  await requireStageFields(ORDER_STAGE.COMPLETED, { ...order, ...plan.data });
  await fsmOrders.update(orderId, plan.data);

  return { orderId };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.completeLogicFunction,
  name: 'complete-service-order',
  description: 'Moves an open service order to Completed and stamps its actual end (and start when empty).',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: COMPLETE_ORDER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
