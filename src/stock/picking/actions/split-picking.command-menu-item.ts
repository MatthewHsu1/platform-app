import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  SPLIT_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SPLIT_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: SPLIT_PICKING_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Split',
  shortLabel: 'Split',
  icon: 'IconArrowsSplit',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: SPLIT_PICKING_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
