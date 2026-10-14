import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import { CANCEL_ORDER_ROUTE_PATH, FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.cancelFrontComponent,
  name: 'cancel-service-order',
  description: 'Cancels the open service order.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: CANCEL_ORDER_ROUTE_PATH,
    successMessage: msg('Order cancelled.'),
    fallbackError: msg('Could not cancel the order.'),
  }),
});
