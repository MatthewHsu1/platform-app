import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-crm/helpdesk-crm-universal-identifiers.constant';

// Always listed for one open case: the lead rights are the sales roles', which the condition cannot read.
export default defineCommandMenuItem({
  universalIdentifier: HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOpportunityCommandMenuItem,
  label: 'Create opportunity',
  shortLabel: 'Opportunity',
  icon: 'IconTargetArrow',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOpportunityFrontComponent,
});
