import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.teams,
  name: 'Teams',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
