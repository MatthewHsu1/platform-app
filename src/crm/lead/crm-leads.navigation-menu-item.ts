import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LEADS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_LEADS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Leads',
  position: 0,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
