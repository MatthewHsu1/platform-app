import { defineCommandMenuItem, numberOfSelectedRecords, objectPermissions } from 'twenty-sdk/define';

import {
  ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.order,
  label: 'Order',
  shortLabel: 'Order',
  icon: 'IconShoppingCart',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    objectPermissions.canUpdateObjectRecords,
  frontComponentUniversalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.order,
});
