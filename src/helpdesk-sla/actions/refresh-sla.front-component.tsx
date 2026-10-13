import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { makeCaseActionCommand } from 'src/helpdesk/actions/case-action-command';
import { HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS, REFRESH_SLA_ROUTE_PATH } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';

// The notes of the working-hours and service level rules (src/resource/resource-messages.constant.ts,
// src/helpdesk-sla/helpdesk-sla-messages.constant.ts). The translation extractor reads only front-component
// files, so they are listed here to reach the catalog; each must match its source text exactly.
export const SLA_RULE_TEXTS = [
  msg('Choose a known time zone.'),
  msg('Working hours of one calendar cannot overlap.'),
  msg('The start of the time off must be before its end.'),
  msg('This SLA policy is used by work cases.'),
];

export default defineFrontComponent({
  universalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.refreshSlaFrontComponent,
  name: 'refresh-work-case-sla',
  description: 'Brings the SLA rows of the open work case up to date.',
  isHeadless: true,
  component: makeCaseActionCommand({
    routePath: REFRESH_SLA_ROUTE_PATH,
    successMessage: msg('Service levels refreshed.'),
    fallbackError: msg('Could not refresh the service levels.'),
  }),
});
