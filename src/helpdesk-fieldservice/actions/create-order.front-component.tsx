import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import {
  CREATE_ORDER_FROM_CASE_ROUTE_PATH,
  HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';

// The notes and answers of the work case link. The translation extractor reads only front-component files, so
// they are listed here to reach the catalog; each must match its source text exactly
// (src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant.ts).
export const HELPDESK_FIELDSERVICE_TEXTS = [
  msg('Please complete all service orders related to this work case to close it.'),
  msg('Work case not found.'),
  msg('This service order has no work case.'),
  msg('The work case is already closed.'),
  msg('Some service orders of the work case are still open.'),
  msg('Choose the stage the work case moves to.'),
  msg('Type the resolution of the work case.'),
];

export default defineFrontComponent({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.createOrderFrontComponent,
  name: 'create-service-order-from-work-case',
  description: 'Makes a service order from the selected work case.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: CREATE_ORDER_FROM_CASE_ROUTE_PATH,
    successMessage: msg('Service order created.'),
    fallbackError: msg('Could not create the service order.'),
  }),
});
