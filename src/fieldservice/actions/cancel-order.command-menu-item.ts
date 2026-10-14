import {
  defineCommandMenuItem,
  isSelectAll,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// Hidden on a closed order. The level the button needs is checked by the logic function: a condition cannot read it.
export default defineCommandMenuItem({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.cancelCommandMenuItem,
  label: 'Cancel order',
  shortLabel: 'Cancel',
  icon: 'IconCircleX',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'closedStatus', 'COMPLETED') &&
    noneEquals(selectedRecords, 'closedStatus', 'CANCELLED'),
  frontComponentUniversalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.cancelFrontComponent,
});
