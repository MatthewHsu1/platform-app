import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import {
  ACTIVITY_CANCEL_ROUTE_PATH,
  FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS.cancelFrontComponent,
  name: 'cancel-service-activity',
  description: 'Cancels the selected activity of a service order.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: ACTIVITY_CANCEL_ROUTE_PATH,
    successMessage: msg('Activity cancelled.'),
    fallbackError: msg('Could not cancel the activity.'),
  }),
});
