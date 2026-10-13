import { defineSettingsMenuItem } from 'twenty-sdk/define';

import {
  CRM_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CRM_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/crm/settings/crm-settings-universal-identifiers.constant';

export default defineSettingsMenuItem({
  universalIdentifier: CRM_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  frontComponentUniversalIdentifier: CRM_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  title: 'CRM',
  icon: 'IconTarget',
  position: 2,
});
