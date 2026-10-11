import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import {
  PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  PUT_IN_PACK_PACKAGES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The route checks that the packages have open lines.
export default defineCommandMenuItem({
  universalIdentifier: PUT_IN_PACK_PACKAGES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Put in Pack',
  shortLabel: 'Pack',
  icon: 'IconPackage',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords > 0,
  frontComponentUniversalIdentifier: PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
