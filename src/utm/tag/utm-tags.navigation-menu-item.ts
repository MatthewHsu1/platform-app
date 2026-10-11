import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_TAGS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: UTM_TAGS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Campaign tags',
  position: 9,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
