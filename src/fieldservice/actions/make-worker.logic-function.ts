import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import {
  createAsUser,
  fieldserviceRouteHandler,
  findAsUser,
  readRecordId,
  requireFieldServiceLevel,
} from 'src/fieldservice/actions/fieldservice-action-route';
import { planMakeWorker } from 'src/fieldservice/actions/utils/plan-make-worker.util';
import { fsmPersons } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, MAKE_WORKER_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// The worker is made as the clicking user, so their rights apply.
const handler = fieldserviceRouteHandler(async (body) => {
  const personId = readRecordId(body);

  await requireFieldServiceLevel('fieldService.dispatcher');
  const person = await findAsUser<{ id: string; name: { firstName: string | null; lastName: string | null } | null }>(
    'person',
    'people',
    personId,
    'id name { firstName lastName }',
  );

  if (person === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.partnerNotFound, {}, 404);
  }
  const existing = await fsmPersons.find<{ id: string }>({ partnerId: { eq: personId } }, 'id');
  const name = [person.name?.firstName, person.name?.lastName].filter((part) => part !== null && part !== undefined && part !== '').join(' ');
  const plan = planMakeWorker({ person: { id: personId, name }, hasWorker: existing.length > 0 });

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  const worker = await createAsUser('fsmPerson', plan.data);

  return { workerId: worker.id };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.makeWorkerLogicFunction,
  name: 'make-field-service-worker',
  description: 'Makes a field service worker from a contact.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: MAKE_WORKER_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
