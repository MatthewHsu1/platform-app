import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_MENU_POSITIONS } from 'src/stock/navigation/inventory-object-items';
import {
  INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  INVENTORY_VIEW_NAVIGATION_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: INVENTORY_VIEW_NAVIGATION_UNIVERSAL_IDENTIFIERS.replenishment,
  name: 'Replenishment',
  position: INVENTORY_MENU_POSITIONS.replenishment,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: ORDERPOINT_VIEW_UNIVERSAL_IDENTIFIERS.replenishment,
  folderUniversalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
