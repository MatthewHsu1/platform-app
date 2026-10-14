import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { FIELDSERVICE_ACTIVITY_MESSAGES } from 'src/fieldservice-activity/fieldservice-activity-messages.constant';
import { type ActivityForAction } from 'src/fieldservice-activity/types/activity-for-action.type';

// Cancelling an item that is still to do only changes its state: nobody completed it.
export const planActivityCancel = (activity: ActivityForAction): OrderActionPlan => {
  if (activity.fsmOrderId === null) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTIVITY_MESSAGES.notOrderActivity };
  }
  if (activity.state !== ACTIVITY_STATE.TODO) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTIVITY_MESSAGES.alreadyHandled };
  }
  return { kind: 'write', data: { state: ACTIVITY_STATE.CANCEL } };
};
