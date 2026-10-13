import { defineSettingsMenuItem } from 'twenty-sdk/define';

import {
  HELPDESK_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  HELPDESK_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/settings/helpdesk-settings-universal-identifiers.constant';

export default defineSettingsMenuItem({
  universalIdentifier: HELPDESK_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: HELPDESK_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  title: 'Work cases',
  icon: 'IconLifebuoy',
  position: 3,
});
