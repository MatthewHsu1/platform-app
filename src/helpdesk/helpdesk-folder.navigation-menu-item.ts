import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
  name: 'Work cases',
  icon: 'IconLifebuoy',
  position: 104,
  type: NavigationMenuItemType.FOLDER,
});
