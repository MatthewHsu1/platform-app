import { LEAD_TYPE, PRIORITY } from 'src/crm/crm-options.constant';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { ORDER_PRIORITY } from 'src/fieldservice/fieldservice-options.constant';
import { type LeadForOrder } from 'src/fieldservice-crm/types/lead-for-order.type';

// The two priority lists line up by position: the lowest opportunity priority is a normal order, the highest an
// urgent one.
const ORDER_PRIORITY_OF_LEAD: Record<string, string> = {
  [PRIORITY.LOW]: ORDER_PRIORITY.NORMAL,
  [PRIORITY.MEDIUM]: ORDER_PRIORITY.LOW,
  [PRIORITY.HIGH]: ORDER_PRIORITY.HIGH,
  [PRIORITY.VERY_HIGH]: ORDER_PRIORITY.URGENT,
};

// An opportunity with a service location becomes an order there, with its description and priority, linked back
// to the opportunity. A lead is not offered one.
export const planOrderFromLead = (lead: LeadForOrder): OrderActionPlan => {
  if (lead.leadType === LEAD_TYPE.LEAD) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.onlyOpportunity };
  }
  if (lead.fsmLocationId === null) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.opportunityNeedsLocation };
  }
  return {
    kind: 'write',
    data: {
      opportunityId: lead.id,
      locationId: lead.fsmLocationId,
      priority: ORDER_PRIORITY_OF_LEAD[lead.priority ?? PRIORITY.LOW] ?? ORDER_PRIORITY.NORMAL,
      ...(lead.description === null ? {} : { description: { markdown: lead.description } }),
    },
  };
};
