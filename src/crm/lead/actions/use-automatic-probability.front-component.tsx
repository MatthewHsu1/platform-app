import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeLeadActionCommand } from 'src/crm/lead/actions/lead-action-command';
import {
  USE_AUTOMATIC_PROBABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  USE_AUTOMATIC_PROBABILITY_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: USE_AUTOMATIC_PROBABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'use-automatic-probability',
  description: 'Sets the open lead to its automatic probability.',
  isHeadless: true,
  component: makeLeadActionCommand({
    routePath: USE_AUTOMATIC_PROBABILITY_ROUTE_PATH,
    successMessage: msg('The lead follows the automatic probability.'),
    fallbackError: msg('Could not change the probability.'),
  }),
});
