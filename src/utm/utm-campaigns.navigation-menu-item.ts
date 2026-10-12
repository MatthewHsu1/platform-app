import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import {
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_CAMPAIGNS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: UTM_CAMPAIGNS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Campaigns',
  position: 0,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: CRM_SCREEN_IDS.utmFolder,
});
