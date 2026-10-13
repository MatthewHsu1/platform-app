import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELISTS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCT_PRICELISTS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Pricelists',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
