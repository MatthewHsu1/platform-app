import { defineCommandMenuItem, numberOfSelectedRecords, targetObjectWritePermissions } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  UPDATE_QUANTITY_VARIANT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The variant has no "track inventory" field of its own (it is on the
// product), so the route refuses a variant whose product does not track it.
export default defineCommandMenuItem({
  universalIdentifier: UPDATE_QUANTITY_VARIANT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Update quantity',
  icon: 'IconEdit',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    targetObjectWritePermissions.stockQuant,
  frontComponentUniversalIdentifier: UPDATE_QUANTITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
