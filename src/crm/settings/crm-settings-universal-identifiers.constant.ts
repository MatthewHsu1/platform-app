const CRM_SETTINGS_IDS = {
  frontComponent: '18e2eafa-02db-45e2-b980-22526670f5cc',
  settingsMenuItem: 'fff17396-1ff1-4329-80d0-f3460388771f',
  readFunction: '80771d83-4006-4a0f-8e7e-b64d55b84190',
  saveFunction: 'b1619f5d-e0a3-481f-a491-ac707d516c35',
} as const;

export const CRM_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = CRM_SETTINGS_IDS.frontComponent;
export const CRM_SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER = CRM_SETTINGS_IDS.settingsMenuItem;
export const READ_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = CRM_SETTINGS_IDS.readFunction;
export const SAVE_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = CRM_SETTINGS_IDS.saveFunction;

export const READ_CRM_SETTINGS_ROUTE_PATH = '/crm/settings/read';
export const SAVE_CRM_SETTINGS_ROUTE_PATH = '/crm/settings/save';
