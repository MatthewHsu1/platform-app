import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  STOCK_PICKING_BATCH_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: STOCK_PICKING_BATCH_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.checkAvailability,
  label: 'Check Availability',
  shortLabel: 'Reserve',
  icon: 'IconListCheck',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL') &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false) &&
    targetObjectWritePermissions.stockPicking,
  frontComponentUniversalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.checkAvailability,
});
