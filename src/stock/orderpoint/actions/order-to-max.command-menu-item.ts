import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.orderToMax,
  label: 'Order To Max',
  shortLabel: 'To max',
  icon: 'IconArrowBarToUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.orderToMax,
});
