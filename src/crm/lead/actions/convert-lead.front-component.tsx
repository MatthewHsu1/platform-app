import { defineFrontComponent } from 'twenty-sdk/define';

import { makeLeadActionCommand } from 'src/crm/lead/actions/lead-action-command';
import {
  CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'convert-lead',
  description: 'Converts the open lead to an opportunity.',
  isHeadless: true,
  component: makeLeadActionCommand({
    routePath: CONVERT_LEAD_ROUTE_PATH,
    successMessage: 'Lead converted to an opportunity.',
    fallbackError: 'Could not convert the lead.',
  }),
});
