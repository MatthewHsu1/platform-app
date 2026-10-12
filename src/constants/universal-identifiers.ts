export const APP_DISPLAY_NAME = 'Platform';
export const APP_DESCRIPTION =
  'Business modules: CRM leads and pipeline with UTM sources, mediums and campaigns, inventory and products, and the Roles page that gives each person the building blocks of each module.';

// The server finds Platform by this identifier (the OWNER_ROW_ACCESS_APPLICATION_UNIVERSAL_IDENTIFIER and ROLE_MANAGER_APPLICATION_UNIVERSAL_IDENTIFIERS settings name it): it reads the row rules from Platform's variable, allows rules on its objects, and lets it write roles. Never change it.
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '39a89e81-0862-4929-a8ae-7a897d52f0a3';
export const FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  '241a576d-e7d0-47d3-b56b-b4eabb4561aa';
export const POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  'f066c871-ab6b-4f1c-b075-899d33be8e80';
export const ROW_ACCESS_CONFIG_VARIABLE_UNIVERSAL_IDENTIFIER =
  '5e1d5cf9-e77f-45dc-a60c-afb578d217f6';
export const PRODUCT_UNIT_DIGITS_VARIABLE_UNIVERSAL_IDENTIFIER =
  '7451c67d-7ad3-495e-be23-a13584192233';
export const ANNUAL_INVENTORY_MONTH_VARIABLE_UNIVERSAL_IDENTIFIER =
  '49b13e2d-12cb-4e01-a231-ab42bd982424';
export const ANNUAL_INVENTORY_DAY_VARIABLE_UNIVERSAL_IDENTIFIER =
  '77cd1c83-87f2-4b1f-b144-af1c2daa3017';
export const SHOW_EXPECTED_QUANTITY_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER =
  '3a1d588e-e1b1-4b0a-9f42-c306f053fb8a';
export const SALES_TEAM_MEMBERSHIP_MULTI_VARIABLE_UNIVERSAL_IDENTIFIER =
  '402ad9c2-79b6-4e3f-9bac-9c4568ace914';

export const PRE_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '10ae1cd5-a8f6-468f-8aac-f56b2291b32a';

export const CRM_ASSIGNMENT_VARIABLE_UNIVERSAL_IDENTIFIERS = {
  autoAssignment: '31519536-858a-4c15-838e-c4a976e4e61a',
  autoAssignmentAction: '0580e070-ed29-4f7d-89c6-e5b581fddd37',
  intervalNumber: 'ff0ebc3b-3d8e-418c-a2fa-9f1ad527669c',
  intervalType: '6b4ee485-46e3-4f3d-ab70-0494689fdfc0',
  nextRun: 'cc5ec2e0-9e30-4818-aff7-2d880ecb27c0',
  delayHours: 'ae7b20ef-e0d4-4819-9e7a-dac4d27fb832',
} as const;

export const CRM_PLS_FIELDS_VARIABLE_UNIVERSAL_IDENTIFIER = 'c30d65be-904f-4d52-95c4-35c5c88764eb';
export const CRM_PLS_START_DATE_VARIABLE_UNIVERSAL_IDENTIFIER = 'a02bfaf3-10cf-4335-884e-4e4b4397e718';
export const CRM_PLS_REBUILD_CRON_VARIABLE_UNIVERSAL_IDENTIFIER = '148ef347-f625-45be-b324-413cec5dc8d9';
export const CRM_USE_LEADS_VARIABLE_UNIVERSAL_IDENTIFIER = 'bd554e34-53e1-4692-904c-d0f1419cfb2b';
export const CRM_USE_RECURRING_REVENUES_VARIABLE_UNIVERSAL_IDENTIFIER = 'ffec2224-4bb2-4713-8604-906ca4c060e3';

export const PLUG_VARIABLE_UNIVERSAL_IDENTIFIERS = {
  plugPoints: 'df81f4f2-7140-45f0-895f-5b91965a214f',
  crmAssignmentKey: '092bf06b-664b-4ea6-a9cc-99b87534dd71',
} as const;
