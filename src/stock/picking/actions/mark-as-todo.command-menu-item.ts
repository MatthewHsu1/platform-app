import { defineCommandMenuItem, everyEquals, noneEquals, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import {
  MARK_AS_TODO_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MARK_AS_TODO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: MARK_AS_TODO_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Mark as Todo',
  shortLabel: 'To do',
  icon: 'IconCheck',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    everyEquals(selectedRecords, 'state', 'DRAFT') &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: MARK_AS_TODO_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
