import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  UPDATE_QUANTITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: UPDATE_QUANTITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Update quantity',
  icon: 'IconEdit',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'isStorable', true),
  frontComponentUniversalIdentifier: UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
