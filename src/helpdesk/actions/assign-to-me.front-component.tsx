import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeCaseActionCommand } from 'src/helpdesk/actions/case-action-command';
import {
  ASSIGN_TO_ME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  ASSIGN_TO_ME_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';

// The answers of the work case buttons and the notes the work case rules write. The translation extractor
// reads only front-component files, so they are listed here to reach the catalog; each must match its
// source text exactly (src/helpdesk/helpdesk-messages.constant.ts, helpdesk-action-messages.constant.ts).
export const HELPDESK_RULE_TEXTS = [
  msg('A team cannot be its own parent.'),
  msg('A category cannot be its own parent.'),
  msg('This stage is used by work cases.'),
  msg('Select one work case.'),
  msg('Select at least one work case.'),
  msg('Work case not found.'),
  msg('None of the selected work cases could be read.'),
  msg('This case is already assigned to you.'),
  msg("You are not a member of this case's team."),
  msg('Choose a valid original case.'),
  msg('Duplicate tracking is turned off in the work case settings.'),
  msg('You need sales rights to create an opportunity.'),
  msg('Opportunity created'),
  msg('This case became opportunity {name}'),
  msg('Your role does not allow this.'),
  msg('This action needs a signed-in person: an API key cannot use it.'),
];

export default defineFrontComponent({
  universalIdentifier: ASSIGN_TO_ME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'assign-work-case-to-me',
  description: 'Gives the open work case to the clicking user.',
  isHeadless: true,
  component: makeCaseActionCommand({
    routePath: ASSIGN_TO_ME_ROUTE_PATH,
    successMessage: msg('Case assigned to you.'),
    fallbackError: msg('Could not assign the case.'),
  }),
});
