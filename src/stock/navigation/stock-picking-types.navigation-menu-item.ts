import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_MENU_POSITIONS } from 'src/stock/navigation/inventory-object-items';
import {
  INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS,
  INVENTORY_NAVIGATION_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-pages-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: INVENTORY_NAVIGATION_UNIVERSAL_IDENTIFIERS.operationTypes,
  name: 'Operation Types',
  position: INVENTORY_MENU_POSITIONS.operationTypes,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS.operationTypes,
  folderUniversalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
