import { defineCommandMenuItem, numberOfSelectedRecords, targetObjectWritePermissions } from 'twenty-sdk/define';

import {
  REVERT_INVENTORY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  REVERT_INVENTORY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: REVERT_INVENTORY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Revert inventory adjustment',
  icon: 'IconArrowBackUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    targetObjectWritePermissions.stockMove,
  frontComponentUniversalIdentifier: REVERT_INVENTORY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
