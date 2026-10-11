import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import {
  CLEAR_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CLEAR_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: CLEAR_COUNT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Clear',
  icon: 'IconEraser',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'inventoryQuantitySet', true),
  frontComponentUniversalIdentifier: CLEAR_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
