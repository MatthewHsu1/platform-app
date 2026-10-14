import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';

// A contact becomes one field service worker, named after the contact.
export const planMakeWorker = ({ person, hasWorker }: { person: { id: string; name: string }; hasWorker: boolean }): OrderActionPlan =>
  hasWorker
    ? { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.workerExists }
    : { kind: 'write', data: { name: person.name, partnerId: person.id } };
