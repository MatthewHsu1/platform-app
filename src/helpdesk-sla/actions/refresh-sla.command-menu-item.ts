import { defineCommandMenuItem, isSelectAll, noneEquals, numberOfSelectedRecords, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';

// Always listed for one open case, whether or not its team uses service levels.
export default defineCommandMenuItem({
  universalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.refreshSlaCommandMenuItem,
  label: 'Refresh SLA',
  shortLabel: 'Refresh SLA',
  icon: 'IconRefresh',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.refreshSlaFrontComponent,
});
