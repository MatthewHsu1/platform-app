import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import {
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: UTM_SOURCES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Sources',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_SCREEN_IDS.utmFolder,
});
