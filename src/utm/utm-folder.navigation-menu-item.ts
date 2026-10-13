import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: CRM_SCREEN_IDS.utmFolder,
  name: 'UTM',
  icon: 'IconSpeakerphone',
  position: 101,
  type: NavigationMenuItemType.FOLDER,
});
