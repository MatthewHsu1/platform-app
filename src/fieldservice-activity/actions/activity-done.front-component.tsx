import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeRecordActionCommand } from 'src/fieldservice/actions/record-action-command';
import {
  ACTIVITY_DONE_ROUTE_PATH,
  FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';

// The answers of the checklist buttons and of the Complete guard. The translation extractor reads only
// front-component files, so they are listed here to reach the catalog; each must match its source text exactly
// (src/fieldservice-activity/fieldservice-activity-messages.constant.ts).
export const FIELDSERVICE_ACTIVITY_RULE_TEXTS = [
  msg("You must complete activity '{name}' before completing this order."),
  msg('Service activity not found.'),
  msg('This activity is already completed or cancelled.'),
  msg('Only an activity of a service order can be completed or cancelled.'),
];

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS.doneFrontComponent,
  name: 'complete-service-activity',
  description: 'Completes the selected activity of a service order.',
  isHeadless: true,
  component: makeRecordActionCommand({
    routePath: ACTIVITY_DONE_ROUTE_PATH,
    successMessage: msg('Activity completed.'),
    fallbackError: msg('Could not complete the activity.'),
  }),
});
