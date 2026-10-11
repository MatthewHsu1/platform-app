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

// The notes of the sales team rules (src/sales-team/team/team-messages.ts), listed for the extractor the
// same way: sales teams have no front component of their own yet.
export const SALES_TEAM_RULE_TEXTS = [
  msg('This is a default sales team. It cannot be deleted; it can stay archived.'),
  msg('Some pipeline stages are limited to this sales team. Take the team off those stages first.'),
  msg('{name} is already an active member of this team. The new or changed membership was undone.'),
];

// The answers of the Mark won route, listed for the extractor the same way.
export const MARK_WON_TEXTS = [
  msg('leadId is required.'),
  msg('Lead not found.'),
  msg('Only an opportunity can be marked won. Convert the lead first.'),
  msg('This lead is already won.'),
  msg('A lost lead must be restored before it is marked won.'),
  msg("No won stage fits this lead's sales team. Mark a stage as won first."),
  msg('Your role does not allow this.'),
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
