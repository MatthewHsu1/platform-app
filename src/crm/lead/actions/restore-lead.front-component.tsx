import { defineFrontComponent } from 'twenty-sdk/define';

import { makeLeadActionCommand } from 'src/crm/lead/actions/lead-action-command';
import {
  RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  RESTORE_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'restore-lead',
  description: 'Puts the open lost lead back into the pipeline.',
  isHeadless: true,
  component: makeLeadActionCommand({
    routePath: RESTORE_LEAD_ROUTE_PATH,
    successMessage: 'Lead restored.',
    fallbackError: 'Could not restore the lead.',
  }),
});
