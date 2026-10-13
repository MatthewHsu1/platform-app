import { defineCommandMenuItem, noneEquals, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import {
  CHECK_AVAILABILITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CHECK_AVAILABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Shown on waiting and ready transfers; the logic function also skips those
// with nothing left to reserve.
export default defineCommandMenuItem({
  universalIdentifier: CHECK_AVAILABILITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Check Availability',
  shortLabel: 'Reserve',
  icon: 'IconRefresh',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    noneEquals(selectedRecords, 'state', 'DRAFT') &&
    noneEquals(selectedRecords, 'state', 'DONE') &&
    noneEquals(selectedRecords, 'state', 'CANCEL') &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: CHECK_AVAILABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
