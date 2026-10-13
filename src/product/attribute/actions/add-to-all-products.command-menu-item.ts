import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import {
  ADD_TO_ALL_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  ADD_TO_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';
import { PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: ADD_TO_ALL_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Add to all products',
  shortLabel: 'Add to all',
  icon: 'IconPlus',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: ADD_TO_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
