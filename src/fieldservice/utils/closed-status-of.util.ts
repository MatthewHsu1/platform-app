import { CLOSED_STATUS, ORDER_STAGE } from 'src/fieldservice/fieldservice-options.constant';
import { type ClosedStatus } from 'src/fieldservice/types/closed-status.type';

// Completed and Cancelled are the closing stages; every other stage, staff ones included, leaves an order open.
export const closedStatusOf = (stage: string | null): ClosedStatus => {
  if (stage === ORDER_STAGE.COMPLETED) {
    return CLOSED_STATUS.COMPLETED;
  }
  if (stage === ORDER_STAGE.CANCELLED) {
    return CLOSED_STATUS.CANCELLED;
  }
  return CLOSED_STATUS.OPEN;
};
