import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  SET_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SET_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: SET_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Set',
  icon: 'IconClipboardCheck',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: SET_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
