import { CASE_PRIORITY } from 'src/helpdesk/helpdesk-options.constant';
import { ORDER_PRIORITY } from 'src/fieldservice/fieldservice-options.constant';
import { type CaseForOrder } from 'src/helpdesk-fieldservice/types/case-for-order.type';
import { markdownToPlainText } from 'src/helpdesk-fieldservice/utils/markdown-to-plain-text.util';

// The two priority lists line up by position: the lowest case priority is a normal order, the highest an urgent
// one.
const ORDER_PRIORITY_OF_CASE: Record<string, string> = {
  [CASE_PRIORITY.LOW]: ORDER_PRIORITY.NORMAL,
  [CASE_PRIORITY.MEDIUM]: ORDER_PRIORITY.LOW,
  [CASE_PRIORITY.HIGH]: ORDER_PRIORITY.HIGH,
  [CASE_PRIORITY.VERY_HIGH]: ORDER_PRIORITY.URGENT,
};

// A service order made from a work case: linked to it, with its priority, its service location and its
// description as plain text. The location stays optional: a case without one still gets an order.
export const planOrderFromCase = (workCase: CaseForOrder) => {
  const description = workCase.description === null ? '' : markdownToPlainText(workCase.description);

  return {
    ticketId: workCase.id,
    priority: ORDER_PRIORITY_OF_CASE[workCase.priority ?? CASE_PRIORITY.LOW] ?? ORDER_PRIORITY.NORMAL,
    ...(workCase.fsmLocationId === null ? {} : { locationId: workCase.fsmLocationId }),
    ...(description === '' ? {} : { description: { markdown: description } }),
  };
};
