import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
  RESOURCE_CALENDARS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/resource/resource-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: RESOURCE_CALENDARS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Working hours',
  position: 8,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: RESOURCE_CALENDAR_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
