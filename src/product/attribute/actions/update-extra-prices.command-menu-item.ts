import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import {
  UPDATE_EXTRA_PRICES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  UPDATE_EXTRA_PRICES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';
import { PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: UPDATE_EXTRA_PRICES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Update extra prices',
  shortLabel: 'Update prices',
  icon: 'IconCoin',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: UPDATE_EXTRA_PRICES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
