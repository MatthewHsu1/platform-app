import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  BASE_TERRITORY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base-territory/base-territory-universal-identifiers.constant';
import { FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

// The service areas sit in the Field service folder: no other module uses them.
export default defineNavigationMenuItem({
  universalIdentifier: BASE_TERRITORY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.branches,
  name: 'Branches',
  position: 9,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
