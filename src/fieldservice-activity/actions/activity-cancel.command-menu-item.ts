import { defineCommandMenuItem, isSelectAll, noneEquals, numberOfSelectedRecords, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import {
  FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS,
  FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';

// Hidden on an item that is done or cancelled. The level the button needs, and that the item belongs to an order,
// are checked by the logic function: a condition cannot read them.
export default defineCommandMenuItem({
  universalIdentifier: FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS.cancelCommandMenuItem,
  label: 'Cancel activity',
  shortLabel: 'Cancel',
  icon: 'IconCircleX',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS.cancelFrontComponent,
});
