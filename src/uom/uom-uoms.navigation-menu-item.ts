import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import {
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  UOM_UOMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: UOM_UOMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Units of measure',
  position: 7,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: PRODUCT_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
