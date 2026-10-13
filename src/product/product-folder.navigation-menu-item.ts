import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Products',
  icon: 'IconPackage',
  position: 102,
  type: NavigationMenuItemType.FOLDER,
});
