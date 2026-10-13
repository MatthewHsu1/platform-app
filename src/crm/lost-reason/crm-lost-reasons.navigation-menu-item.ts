import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASONS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_LOST_REASONS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Lost reasons',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
