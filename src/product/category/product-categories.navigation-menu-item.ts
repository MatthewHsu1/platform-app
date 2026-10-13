import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  PRODUCT_CATEGORIES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCT_CATEGORIES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Product categories',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
