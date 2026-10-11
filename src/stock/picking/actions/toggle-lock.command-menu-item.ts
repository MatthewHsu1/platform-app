import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  TOGGLE_LOCK_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  TOGGLE_LOCK_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// For Inventory Administrators; the role is not checked until roles are assigned.
export default defineCommandMenuItem({
  universalIdentifier: TOGGLE_LOCK_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Lock / Unlock',
  shortLabel: 'Lock',
  icon: 'IconLockOpen',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false) &&
    targetObjectWritePermissions.stockWarehouse,
  frontComponentUniversalIdentifier: TOGGLE_LOCK_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
