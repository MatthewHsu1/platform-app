import { defineCommandMenuItem, numberOfSelectedRecords, objectPermissions } from 'twenty-sdk/define';

import {
  APPLY_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  APPLY_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The list's Apply: asks for the adjustment reference, applies the counted rows of the selection.
export default defineCommandMenuItem({
  universalIdentifier: APPLY_COUNTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Apply counts',
  icon: 'IconChecks',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords,
  frontComponentUniversalIdentifier: APPLY_COUNTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
