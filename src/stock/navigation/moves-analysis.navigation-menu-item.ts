import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { INVENTORY_MENU_POSITIONS } from 'src/stock/navigation/inventory-object-items';
import {
  INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MOVES_ANALYSIS_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-pages-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: MOVES_ANALYSIS_UNIVERSAL_IDENTIFIERS.navigationItem,
  name: 'Moves Analysis',
  icon: 'IconChartBar',
  position: INVENTORY_MENU_POSITIONS.movesAnalysis,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: MOVES_ANALYSIS_UNIVERSAL_IDENTIFIERS.pageLayout,
  folderUniversalIdentifier: INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
