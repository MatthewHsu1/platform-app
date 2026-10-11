import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeLeadActionCommand } from 'src/crm/lead/actions/lead-action-command';
import {
  MARK_WON_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_WON_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// The lead rules answer these texts in the saver's language. The translation
// extractor reads only front-component files, so they are listed here to reach
// the catalog; each must match its source text exactly.
export const LEAD_RULE_TEXTS = [
  msg('A lead in a won stage must stay at 100 %. To mark it lost, move it to another stage first.'),
  msg("{name}'s opportunity"),
];

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
