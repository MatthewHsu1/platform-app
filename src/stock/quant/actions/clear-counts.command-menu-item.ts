import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  CLEAR_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: CLEAR_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Clear counts',
  icon: 'IconEraser',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: CLEAR_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
