import {
  defineCommandMenuItem,
  numberOfSelectedRecords,
  objectPermissions,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  REQUEST_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  REQUEST_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: REQUEST_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Request a Count',
  icon: 'IconCalendarEvent',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    targetObjectWritePermissions.stockWarehouse,
  frontComponentUniversalIdentifier: REQUEST_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
