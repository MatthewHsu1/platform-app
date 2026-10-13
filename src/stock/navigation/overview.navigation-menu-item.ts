import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_MENU_POSITIONS } from 'src/stock/navigation/inventory-object-items';
import { INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-pages-universal-identifiers.constant';
import { OVERVIEW_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: OVERVIEW_UNIVERSAL_IDENTIFIERS.navigationItem,
  name: 'Overview',
  icon: 'IconLayoutDashboard',
  position: INVENTORY_MENU_POSITIONS.overview,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: OVERVIEW_UNIVERSAL_IDENTIFIERS.pageLayout,
  folderUniversalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
