import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { FIELDSERVICE_ACTIVITY_MESSAGES } from 'src/fieldservice-activity/fieldservice-activity-messages.constant';
import { type ActivityForAction } from 'src/fieldservice-activity/types/activity-for-action.type';

// Completing an item that is still to do stamps who and when. Only an item of an order can be completed: the items
// of a template are only patterns.
export const planActivityDone = (activity: ActivityForAction, now: string, memberId: string | null): OrderActionPlan => {
  if (activity.fsmOrderId === null) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTIVITY_MESSAGES.notOrderActivity };
  }
  if (activity.state !== ACTIVITY_STATE.TODO) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTIVITY_MESSAGES.alreadyHandled };
  }
  return {
    kind: 'write',
    data: { completed: true, completedOn: now, ...(memberId === null ? {} : { completedById: memberId }), state: ACTIVITY_STATE.DONE },
  };
};
