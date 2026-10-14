import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { CLOSED_STATUS } from 'src/fieldservice/fieldservice-options.constant';

// Completed is the stage that asks for a signature: the signer's name and the time are kept, and a new signature
// replaces an earlier one.
export const planSignOrder = ({ closedStatus, signedBy }: { closedStatus: string | null; signedBy: string }, now: string): OrderActionPlan => {
  if (closedStatus !== CLOSED_STATUS.COMPLETED) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.signOnlyCompleted };
  }
  const name = signedBy.trim();

  return name === '' ? { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.signerRequired } : { kind: 'write', data: { signedBy: name, signedOn: now } };
};
