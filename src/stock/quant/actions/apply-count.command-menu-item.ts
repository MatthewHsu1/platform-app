import {
  defineCommandMenuItem,
  everyEquals,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  APPLY_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  APPLY_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The row's Apply: one counted row, no adjustment reference asked.
export default defineCommandMenuItem({
  universalIdentifier: APPLY_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Apply',
  icon: 'IconCheck',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    everyEquals(selectedRecords, 'inventoryQuantitySet', true) &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: APPLY_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
