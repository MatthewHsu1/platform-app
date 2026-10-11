import { defineCommandMenuItem, noneEquals, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import {
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  UNRESERVE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  UNRESERVE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: UNRESERVE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Unreserve',
  shortLabel: 'Unreserve',
  icon: 'IconArrowBackUp',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: UNRESERVE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
