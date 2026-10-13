import { defineCommandMenuItem, numberOfSelectedRecords, targetObjectWritePermissions } from 'twenty-sdk/define';

import {
  SCRAP_PRODUCTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SCRAP_PRODUCTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: SCRAP_PRODUCTS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Scrap',
  icon: 'IconTrash',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    targetObjectWritePermissions.stockScrap,
  frontComponentUniversalIdentifier: SCRAP_PRODUCTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
