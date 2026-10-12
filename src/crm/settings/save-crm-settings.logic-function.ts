import { defineLogicFunction } from 'twenty-sdk/define';

import { applySettingsSideEffects } from 'src/crm/settings/apply-settings-side-effects';
import { CRM_SETTINGS_MESSAGES } from 'src/crm/settings/crm-settings-messages.constant';
import {
  SAVE_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SAVE_CRM_SETTINGS_ROUTE_PATH,
} from 'src/crm/settings/crm-settings-universal-identifiers.constant';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { readCrmSettingsForm } from 'src/crm/settings/read-crm-settings-form';
import { settingsRoute } from 'src/crm/settings/settings-route';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { planSettingsSave } from 'src/crm/settings/utils/plan-settings-save.util';
import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { readCallerAccessOrNull } from 'src/roles/read-caller-access';
import { translate } from 'src/shared/i18n/translate';
import { jsonResponse, readBody } from 'src/shared/route-response';

// The page sends every field; the route compares with what is stored,
// because the side effects depend on the old value.
const handler = settingsRoute(async (payload, locale) => {
  const access = await readCallerAccessOrNull();

  if (access?.isWorkspaceAdmin !== true) {
    return jsonResponse(403, { error: translate(locale, CRM_SETTINGS_MESSAGES.onlyWorkspaceAdministratorsSave) });
  }
  const submitted = readBody(payload) as CrmSettingsForm;
  const plan = planSettingsSave({ stored: await readCrmSettingsForm(await readCrmSettings()), submitted, now: new Date().toISOString() });

  if (plan.kind === 'refuse') {
    return jsonResponse(400, { error: translate(locale, plan.reason, plan.values) });
  }
  await writeApplicationVariables(plan.variables);
  const warnings = await applySettingsSideEffects({
    locale,
    useLeadsChanged: plan.useLeadsChanged,
    recurringChanged: plan.recurringChanged,
    useLeads: submitted.useLeads,
    useRecurringRevenues: submitted.useRecurringRevenues,
  });

  return jsonResponse(200, { saved: Object.keys(plan.variables), warnings });
});

export default defineLogicFunction({
  universalIdentifier: SAVE_CRM_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'save-crm-settings',
  description: 'Saves the CRM settings and applies what a changed switch implies (lead type default, sales teams, recurring revenue fields).',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SAVE_CRM_SETTINGS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
