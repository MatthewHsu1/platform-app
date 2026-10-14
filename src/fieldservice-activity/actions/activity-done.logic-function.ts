import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { fieldserviceRouteHandler, findAsUser, readRecordId, requireFieldServiceLevel } from 'src/fieldservice/actions/fieldservice-action-route';
import { fsmActivities } from 'src/fieldservice-activity/fieldservice-activity-records';
import { FIELDSERVICE_ACTIVITY_MESSAGES } from 'src/fieldservice-activity/fieldservice-activity-messages.constant';
import {
  ACTIVITY_DONE_ROUTE_PATH,
  FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { planActivityDone } from 'src/fieldservice-activity/utils/plan-activity-done.util';
import { readCurrentMemberId } from 'src/shared/current-member';

// The item is read as the clicking user (their rights and level checked), then written by the app: the state, the
// time and the member are app-written fields, which the API refuses from a user.
const handler = fieldserviceRouteHandler(async (body) => {
  const activityId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.user');
  const activity = await findAsUser<{ id: string; state: string | null; fsmOrderId: string | null }>(
    'fsmActivity',
    'fsmActivities',
    activityId,
    'id state fsmOrderId',
  );

  if (activity === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTIVITY_MESSAGES.activityNotFound, {}, 404);
  }
  const plan = planActivityDone(activity, new Date().toISOString(), await readCurrentMemberId());

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  await fsmActivities.update(activityId, plan.data);

  return { activityId };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS.doneLogicFunction,
  name: 'complete-service-activity',
  description: 'Marks an activity of a service order as completed, with the time and the member who completed it.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: ACTIVITY_DONE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
