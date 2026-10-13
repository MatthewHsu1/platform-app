import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: ORDERPOINT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.replenishmentInfo,
  label: 'Replenishment information',
  shortLabel: 'Information',
  icon: 'IconInfoCircle',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.replenishmentInfo,
});
