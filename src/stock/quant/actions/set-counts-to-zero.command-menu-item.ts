import {
  defineCommandMenuItem,
  numberOfSelectedRecords,
  objectPermissions,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  SET_COUNTS_TO_ZERO_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_TO_ZERO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: SET_COUNTS_TO_ZERO_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Set to 0',
  icon: 'IconNumber0',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    targetObjectWritePermissions.stockWarehouse,
  frontComponentUniversalIdentifier: SET_COUNTS_TO_ZERO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
