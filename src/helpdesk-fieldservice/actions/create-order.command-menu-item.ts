import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords } from 'twenty-sdk/define';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';

// Listed for one case. The level the button needs is checked by the logic function: a condition cannot read it.
export default defineCommandMenuItem({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.createOrderCommandMenuItem,
  label: 'Create service order',
  shortLabel: 'Service order',
  icon: 'IconTruck',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.createOrderFrontComponent,
});
