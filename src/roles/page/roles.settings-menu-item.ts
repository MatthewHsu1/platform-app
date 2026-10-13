import { defineSettingsMenuItem } from 'twenty-sdk/define';

import { ROLES_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER, ROLES_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/roles/roles-universal-identifiers.constant';

export default defineSettingsMenuItem({
  universalIdentifier: ROLES_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: ROLES_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  title: 'Roles',
  icon: 'IconUserShield',
  position: 1,
});
