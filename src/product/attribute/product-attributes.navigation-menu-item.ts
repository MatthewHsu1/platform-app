import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCT_ATTRIBUTE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Attributes',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
