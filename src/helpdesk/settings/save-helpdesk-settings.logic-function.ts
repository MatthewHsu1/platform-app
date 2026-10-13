import { defineLogicFunction } from 'twenty-sdk/define';

import { settingsRoute } from 'src/crm/settings/settings-route';
import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { HELPDESK_SETTINGS_MESSAGES } from 'src/helpdesk/settings/helpdesk-settings-messages.constant';
import {
  SAVE_HELPDESK_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  SAVE_HELPDESK_SETTINGS_ROUTE_PATH,
} from 'src/helpdesk/settings/helpdesk-settings-universal-identifiers.constant';
import { holdsHelpdeskAdministrator } from 'src/helpdesk/settings/utils/holds-helpdesk-administrator.util';
import { planHelpdeskSettingsSave } from 'src/helpdesk/settings/utils/plan-helpdesk-settings-save.util';
import { readHelpdeskSettings } from 'src/helpdesk/read-helpdesk-settings';
import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';
import { readCallerAccessOrNull } from 'src/roles/read-caller-access';
import { translate } from 'src/shared/i18n/translate';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { records } from 'src/shared/triggers/records';

const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');

// The variables are written with the app token, so the person's right to change them is checked first. The
// stages are read with the app token too: the check is whether the stage exists, not what the person may see.
const handler = settingsRoute(async (payload, locale) => {
  const access = await readCallerAccessOrNull();

  if (access === null || !holdsHelpdeskAdministrator(access)) {
    return jsonResponse(403, { error: translate(locale, HELPDESK_SETTINGS_MESSAGES.onlyAdministratorsSave) });
  }
  const plan = planHelpdeskSettingsSave({
    stored: await readHelpdeskSettings(),
    submitted: readBody(payload) as HelpdeskSettings,
    stageIds: (await stages.find<{ id: string }>({}, 'id')).map((stage) => stage.id),
  });

  if (plan.kind === 'refuse') {
    return jsonResponse(400, { error: translate(locale, plan.reason) });
  }
  await writeApplicationVariables(plan.variables);

  return jsonResponse(200, { saved: Object.keys(plan.variables) });
});

export default defineLogicFunction({
  universalIdentifier: SAVE_HELPDESK_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'save-helpdesk-settings',
  description: 'Saves the work case settings: assigning new cases to their creator, duplicate tracking and the duplicate stage.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SAVE_HELPDESK_SETTINGS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
