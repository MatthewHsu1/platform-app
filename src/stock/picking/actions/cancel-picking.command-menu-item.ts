import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  CANCEL_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CANCEL_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Shown in Draft, Waiting another operation, Waiting and Ready; the route
// refuses a done move whatever the button showed.
export default defineCommandMenuItem({
  universalIdentifier: CANCEL_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Cancel',
  shortLabel: 'Cancel',
  icon: 'IconX',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL') &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: CANCEL_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
