import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { fsmActivities } from 'src/fieldservice-activity/fieldservice-activity-records';
import { FIELDSERVICE_ACTIVITY_MESSAGES } from 'src/fieldservice-activity/fieldservice-activity-messages.constant';
import { type ActivityRow } from 'src/fieldservice-activity/types/activity-row.type';
import { findBlockingActivity } from 'src/fieldservice-activity/utils/find-blocking-activity.util';

// An order cannot complete while one of its required activities is still to do. Read by the app, whatever the
// clicking user may see: the check must not depend on a row they cannot read.
export const requireActivitiesDone = async (orderId: string) => {
  const required = await fsmActivities.find<ActivityRow>(
    { fsmOrderId: { eq: orderId }, required: { eq: true } },
    'id name required sequence ref state createdAt',
  );
  const blocking = findBlockingActivity(required);

  if (blocking !== null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTIVITY_MESSAGES.requiredActivity, { name: blocking.name ?? '' });
  }
};
