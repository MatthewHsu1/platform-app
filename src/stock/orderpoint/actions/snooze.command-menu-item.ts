import { defineCommandMenuItem, numberOfSelectedRecords, objectPermissions } from 'twenty-sdk/define';

import {
  ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Shown on any selection: the route refuses automatic rules with a message
// that tells the person to archive them instead.
export default defineCommandMenuItem({
  universalIdentifier: ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.snooze,
  label: 'Snooze',
  shortLabel: 'Snooze',
  icon: 'IconClockPause',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    objectPermissions.canUpdateObjectRecords,
  frontComponentUniversalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.snooze,
});
