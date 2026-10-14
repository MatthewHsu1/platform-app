import { defineCommandMenuItem, isSelectAll, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';

// Listed on a completed or cancelled order. Whether the order has a work case that can close is checked by the
// pop-up and the logic function: a condition cannot read the case.
export default defineCommandMenuItem({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.closeCaseCommandMenuItem,
  label: 'Close work case',
  shortLabel: 'Close case',
  icon: 'IconLifebuoy',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll && noneEquals(selectedRecords, 'closedStatus', 'OPEN'),
  frontComponentUniversalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.closeCaseFrontComponent,
});
