import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_MENU_POSITIONS } from 'src/stock/navigation/inventory-object-items';
import {
  INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  INVENTORY_VIEW_NAVIGATION_UNIVERSAL_IDENTIFIERS,
  STOCK_VIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-pages-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: INVENTORY_VIEW_NAVIGATION_UNIVERSAL_IDENTIFIERS.waveTransfers,
  name: 'Wave Transfers',
  position: INVENTORY_MENU_POSITIONS.waveTransfers,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: STOCK_VIEW_UNIVERSAL_IDENTIFIERS.waveTransfers,
  folderUniversalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
