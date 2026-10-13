import { defineCommandMenuItem, targetObjectWritePermissions } from 'twenty-sdk/define';

import {
  ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-universal-identifiers.constant';

// Twenty runs no code when a list opens, so the list is opened from here,
// after the suggestions are brought up to date.
export default defineCommandMenuItem({
  universalIdentifier: ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.replenishment,
  label: 'Replenishment',
  icon: 'IconRefresh',
  isPinned: false,
  availabilityType: 'GLOBAL',
  conditionalAvailabilityExpression:
    targetObjectWritePermissions.stockWarehouseOrderpoint,
  frontComponentUniversalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.replenishment,
});
