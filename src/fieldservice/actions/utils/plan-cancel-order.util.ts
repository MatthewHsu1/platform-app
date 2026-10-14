import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { CLOSED_STATUS, ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';

// Cancelling an open order moves it to Cancelled.
export const planCancelOrder = ({ closedStatus }: { closedStatus: string | null }): OrderActionPlan =>
  closedStatus !== null && closedStatus !== CLOSED_STATUS.OPEN
    ? { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.alreadyClosed }
    : { kind: 'write', data: { stage: ORDER_STAGE.CANCELLED } };
