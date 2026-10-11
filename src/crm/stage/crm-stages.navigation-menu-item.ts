import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Stages',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
