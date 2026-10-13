import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.teams,
  name: 'Teams',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
