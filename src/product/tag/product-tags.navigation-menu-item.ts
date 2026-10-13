import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAGS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCT_TAGS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Product tags',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
