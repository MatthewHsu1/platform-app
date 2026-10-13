import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SLA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: HELPDESK_SLA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.slas,
  name: 'SLA policies',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: HELPDESK_SLA_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
