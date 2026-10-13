import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import {
  ADD_TO_TRANSFER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  ADD_TO_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: ADD_TO_TRANSFER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Add to Transfer',
  shortLabel: 'Add',
  icon: 'IconPackageImport',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords > 0,
  frontComponentUniversalIdentifier: ADD_TO_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
