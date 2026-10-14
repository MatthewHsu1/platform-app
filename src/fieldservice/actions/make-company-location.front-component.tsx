import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, MAKE_LOCATION_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.makeCompanyLocationFrontComponent,
  name: 'make-service-location-from-company',
  description: 'Makes a service location from the selected company.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: MAKE_LOCATION_ROUTE_PATH,
    successMessage: msg('Service location made.'),
    fallbackError: msg('Could not make the service location.'),
    body: { kind: 'company' },
  }),
});
