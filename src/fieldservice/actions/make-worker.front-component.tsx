import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, MAKE_WORKER_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.makeWorkerFrontComponent,
  name: 'make-field-service-worker',
  description: 'Makes a field service worker from the selected contact.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: MAKE_WORKER_ROUTE_PATH,
    successMessage: msg('Field service worker made.'),
    fallbackError: msg('Could not make the field service worker.'),
  }),
});
