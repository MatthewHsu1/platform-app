import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import {
  CREATE_ORDER_FROM_LEAD_ROUTE_PATH,
  FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOrderFrontComponent,
  name: 'create-service-order-from-opportunity',
  description: 'Makes a service order from the selected opportunity.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: CREATE_ORDER_FROM_LEAD_ROUTE_PATH,
    successMessage: msg('Service order created.'),
    fallbackError: msg('Could not create the service order.'),
  }),
});
