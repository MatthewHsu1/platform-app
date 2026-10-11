import { defineCommandMenuItem, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import {
  PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  PUT_IN_PACK_MOVE_LINES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The route checks the state again.
export default defineCommandMenuItem({
  universalIdentifier: PUT_IN_PACK_MOVE_LINES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Put in Pack',
  shortLabel: 'Pack',
  icon: 'IconPackage',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    noneEquals(selectedRecords, 'state', 'DRAFT') &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
