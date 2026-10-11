import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import {
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  VALIDATE_SCRAP_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  VALIDATE_SCRAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Hiding the button is a convenience; the route checks the state again.
export default defineCommandMenuItem({
  universalIdentifier: VALIDATE_SCRAP_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Validate',
  shortLabel: 'Validate',
  icon: 'IconCheck',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'state', 'DRAFT'),
  frontComponentUniversalIdentifier: VALIDATE_SCRAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
