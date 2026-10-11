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
  universalIdentifier: STOCK_PICKING_BATCH_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.unreserve,
  label: 'Unreserve',
  shortLabel: 'Unreserve',
  icon: 'IconArrowBackUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false) &&
    targetObjectWritePermissions.stockPicking,
  frontComponentUniversalIdentifier: STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.unreserve,
});
