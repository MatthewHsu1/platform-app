import {
  defineCommandMenuItem,
  everyEquals,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  RETURN_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  RETURN_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// One done transfer. Hiding the button is a convenience; the route checks again.
export default defineCommandMenuItem({
  universalIdentifier: RETURN_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Return',
  shortLabel: 'Return',
  icon: 'IconArrowBackUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    everyEquals(selectedRecords, 'state', 'DONE') &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: RETURN_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
