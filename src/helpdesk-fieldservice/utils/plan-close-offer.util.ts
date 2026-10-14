import { HELPDESK_FIELDSERVICE_MESSAGES } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant';
import { type CloseOffer } from 'src/helpdesk-fieldservice/types/close-offer.type';
import { isOrderClosed } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';

// After an order is completed, its work case may be closed when the case is still open and every one of its
// orders is closed. The resolution of the order is the one to start from.
export const planCloseOffer = ({
  orderClosed,
  orderResolution,
  workCase,
}: {
  orderClosed: boolean;
  orderResolution: string | null;
  workCase: { stageClosed: boolean; orderClosedStatuses: (string | null)[] } | null;
}): CloseOffer => {
  if (workCase === null) {
    return { kind: 'refuse', reason: HELPDESK_FIELDSERVICE_MESSAGES.orderHasNoCase };
  }
  if (workCase.stageClosed) {
    return { kind: 'refuse', reason: HELPDESK_FIELDSERVICE_MESSAGES.caseAlreadyClosed };
  }
  if (!orderClosed || !workCase.orderClosedStatuses.every(isOrderClosed)) {
    return { kind: 'refuse', reason: HELPDESK_FIELDSERVICE_MESSAGES.ordersStillOpen };
  }

  return { kind: 'offer', resolution: orderResolution };
};
