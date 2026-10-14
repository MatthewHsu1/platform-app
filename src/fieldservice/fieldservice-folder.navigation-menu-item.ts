import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
  name: 'Field service',
  icon: 'IconTruck',
  position: 105,
  type: NavigationMenuItemType.FOLDER,
});
