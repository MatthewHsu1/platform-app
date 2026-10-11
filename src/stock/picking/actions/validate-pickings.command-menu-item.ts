import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  VALIDATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  VALIDATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// One or many transfers. Hiding the button is a convenience; the route checks again.
export default defineCommandMenuItem({
  universalIdentifier: VALIDATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Validate',
  shortLabel: 'Validate',
  icon: 'IconCheck',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: VALIDATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
