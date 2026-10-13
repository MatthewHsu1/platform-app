import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TYPES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: HELPDESK_TYPES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Types',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: HELPDESK_TICKET_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
