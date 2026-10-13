import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-pages-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Inventory',
  icon: 'IconBuildingWarehouse',
  position: 2,
  type: NavigationMenuItemType.FOLDER,
});
