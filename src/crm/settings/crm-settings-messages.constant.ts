// What the CRM settings routes answer. English source texts, translated in
// the clicking user's language.
export const CRM_SETTINGS_MESSAGES = {
  onlySalesAdministratorsRead: 'Only a sales administrator can open the CRM settings.',
  onlyWorkspaceAdministratorsSave: 'Only a workspace administrator can change the CRM settings.',
  badForm: 'The CRM settings are not in the expected form.',
  intervalNotPositive: 'The repeat interval must be a whole number above zero.',
  intervalTooLarge: 'Use a larger unit instead of an interval of 100 or more.',
  badPlugSettings: 'The plug settings are not in the expected form.',
  plugPointUnavailable: 'Plug point {name} is not available.',
  plugPointEnabled: 'Say whether {name} is on.',
  plugTarget: 'The target of {name} must be a route path starting with / or an https address.',
  plugTimeout: 'The timeout of {name} must be 1 to 120 seconds.',
  plugOnError: 'Choose what {name} does on an error.',
  plugChoice: 'Choose a value for {key} of {name}.',
  leadTypeDefault: 'Lead type default',
  salesTeams: 'Sales teams',
  recurringRevenueFields: 'Recurring revenue fields',
} as const;
