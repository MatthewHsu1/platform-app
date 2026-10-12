import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import {
  UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: UTM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Stages',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_SCREEN_IDS.utmFolder,
});
