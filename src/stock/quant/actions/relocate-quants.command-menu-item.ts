import {
  defineCommandMenuItem,
  numberOfSelectedRecords,
  objectPermissions,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  RELOCATE_QUANTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  RELOCATE_QUANTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// "All quantities positive" cannot be expressed here: the pop-up and the route refuse.
export default defineCommandMenuItem({
  universalIdentifier: RELOCATE_QUANTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Relocate',
  icon: 'IconArrowsMove',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    targetObjectWritePermissions.stockWarehouse,
  frontComponentUniversalIdentifier: RELOCATE_QUANTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
