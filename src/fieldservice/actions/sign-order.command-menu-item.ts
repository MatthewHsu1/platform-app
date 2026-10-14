import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords } from 'twenty-sdk/define';

import {
  FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// Listed for any one order: the closed status may be a hidden column, which the condition cannot read. The logic
// function signs only a completed order.
export default defineCommandMenuItem({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.signCommandMenuItem,
  label: 'Sign',
  shortLabel: 'Sign',
  icon: 'IconSignature',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.signFrontComponent,
});
