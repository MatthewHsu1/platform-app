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

// The notes on a stage or lost reason whose delete was undone, listed for the
// extractor the same way.
export const CRM_DELETE_REFUSAL_TEXTS = [
  msg('This stage still holds leads. Move them to another stage first, then delete it.'),
  msg('This lost reason is used by leads. Archive it instead (untick Active).'),
];

// The answers of the Mark won route, listed for the extractor the same way.
export const MARK_WON_TEXTS = [
  msg('leadId is required.'),
  msg('Lead not found.'),
  msg('Only an opportunity can be marked won. Convert the lead first.'),
  msg('This lead is already won.'),
  msg('A lost lead must be restored before it is marked won.'),
  msg("No won stage fits this lead's sales team. Mark a stage as won first."),
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
