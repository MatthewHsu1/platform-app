import { defineFrontComponent } from 'twenty-sdk/define';

import { makeLeadActionCommand } from 'src/crm/lead/actions/lead-action-command';
import {
  MARK_WON_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_WON_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: MARK_WON_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'mark-lead-won',
  description: 'Marks the open lead won.',
  isHeadless: true,
  component: makeLeadActionCommand({
    routePath: MARK_WON_ROUTE_PATH,
    successMessage: 'Lead marked won.',
    fallbackError: 'Could not mark the lead won.',
  }),
});
