import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { fieldserviceRouteHandler, findAsUser, readRecordId } from 'src/fieldservice/actions/fieldservice-action-route';
import { planSignOrder } from 'src/fieldservice/actions/utils/plan-sign-order.util';
import { fsmOrders } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, SIGN_ORDER_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';

// The order is read as the clicking user, so only someone who may see it signs it; the signature fields are the
// app's, so the app writes them and a note on the order.
const handler = fieldserviceRouteHandler(async (body) => {
  const orderId = readRecordId(body);
  const order = await findAsUser<{ id: string; closedStatus: string | null }>('fsmOrder', 'fsmOrders', orderId, 'id closedStatus');

  if (order === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.orderNotFound, {}, 404);
  }
  const plan = planSignOrder({ closedStatus: order.closedStatus, signedBy: typeof body.signedBy === 'string' ? body.signedBy : '' }, new Date().toISOString());

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  await fsmOrders.update(orderId, plan.data);
  const locale = await readUserLocale();

  await addNote({
    objectSingular: 'fsmOrder',
    recordId: orderId,
    title: translate(locale, FIELDSERVICE_ACTION_MESSAGES.signedNoteTitle),
    body: translate(locale, FIELDSERVICE_ACTION_MESSAGES.signedNoteBody, { name: String(plan.data.signedBy) }),
  });

  return { orderId };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.signLogicFunction,
  name: 'sign-service-order',
  description: 'Keeps the name of the person who signs a completed service order, and the time.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SIGN_ORDER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
