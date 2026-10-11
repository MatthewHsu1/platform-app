import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_TEAMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Teams',
  position: 7,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
