import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'CRM',
  icon: 'IconTarget',
  position: 0,
  type: NavigationMenuItemType.FOLDER,
});
