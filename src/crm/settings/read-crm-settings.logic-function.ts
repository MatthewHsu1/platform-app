import { defineLogicFunction } from 'twenty-sdk/define';

import { CRM_SETTINGS_MESSAGES } from 'src/crm/settings/crm-settings-messages.constant';
import {
  READ_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  READ_CRM_SETTINGS_ROUTE_PATH,
} from 'src/crm/settings/crm-settings-universal-identifiers.constant';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { isPlugKeySet, readCrmSettingsForm } from 'src/crm/settings/read-crm-settings-form';
import { settingsRoute } from 'src/crm/settings/settings-route';
import { holdsSalesAdministrator } from 'src/crm/settings/utils/holds-sales-administrator.util';
import { readCallerAccessOrNull } from 'src/roles/read-caller-access';
import { translate } from 'src/shared/i18n/translate';
import { jsonResponse } from 'src/shared/route-response';

// Sales administrators may look; only a workspace administrator may change
// the settings or update the probabilities.
const handler = settingsRoute(async (_payload, locale) => {
  const access = await readCallerAccessOrNull();

  if (access === null || !holdsSalesAdministrator(access)) {
    return jsonResponse(403, { error: translate(locale, CRM_SETTINGS_MESSAGES.onlySalesAdministratorsRead) });
  }
  const settings = await readCrmSettings();

  return jsonResponse(200, {
    ...(await readCrmSettingsForm(settings)),
    plugKeySet: await isPlugKeySet(),
    canSave: access.isWorkspaceAdmin,
    canUpdateProbabilities: access.isWorkspaceAdmin,
    plsStartDate: settings.plsStartDate,
    plsFields: settings.plsFields,
  });
});

export default defineLogicFunction({
  universalIdentifier: READ_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'read-crm-settings',
  description: 'Returns the CRM settings for the settings page; the plug key is never returned.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: READ_CRM_SETTINGS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
