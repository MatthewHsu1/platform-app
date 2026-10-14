import { CLOSED_STATUS } from 'src/fieldservice/fieldservice-options.constant';
import { HELPDESK_FIELDSERVICE_MESSAGES } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant';
import { type CaseCloseGuardPlan } from 'src/helpdesk-fieldservice/types/case-close-guard-plan.type';

// An order is closed when it is completed or cancelled.
export const isOrderClosed = (closedStatus: string | null) => closedStatus !== null && closedStatus !== CLOSED_STATUS.OPEN;

// A work case may reach a closed stage only when every service order made for it is closed. A case with no
// orders closes freely.
export const planCaseCloseGuard = ({
  stageClosed,
  orderClosedStatuses,
}: {
  stageClosed: boolean;
  orderClosedStatuses: (string | null)[];
}): CaseCloseGuardPlan =>
  stageClosed && orderClosedStatuses.length > 0 && !orderClosedStatuses.every(isOrderClosed)
    ? { allow: false, reason: HELPDESK_FIELDSERVICE_MESSAGES.openOrders }
    : { allow: true };
