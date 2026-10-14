import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { CLOSED_STATUS, ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';

// Completing an open order moves it to Completed and stamps its actual end now, and its actual start now when it
// has none.
export const planCompleteOrder = ({ closedStatus, dateStart }: { closedStatus: string | null; dateStart: string | null }, now: string): OrderActionPlan =>
  closedStatus !== null && closedStatus !== CLOSED_STATUS.OPEN
    ? { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.alreadyClosed }
    : {
        kind: 'write',
        data: { stage: ORDER_STAGE.COMPLETED, closedStatus: CLOSED_STATUS.COMPLETED, dateEnd: now, ...(dateStart === null ? { dateStart: now } : {}) },
      };
