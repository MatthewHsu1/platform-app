import { defineCommandMenuItem, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import {
  GENERATE_LOT_LINES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  GENERATE_LOT_LINES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/lot/actions/lot-actions-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The product's tracking is two relations away, out of reach here: the route
// refuses an untracked product.
export default defineCommandMenuItem({
  universalIdentifier: GENERATE_LOT_LINES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Generate Serials/Lots',
  shortLabel: 'Serials/Lots',
  icon: 'IconBarcode',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL'),
  frontComponentUniversalIdentifier: GENERATE_LOT_LINES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
