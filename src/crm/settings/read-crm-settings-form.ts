import { CRM_SETTINGS_VARIABLE_KEYS } from 'src/crm/settings/crm-settings-variable-keys.constant';
import { type CrmSettings } from 'src/crm/settings/types/crm-settings.type';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { formPlugPoints } from 'src/crm/settings/utils/form-plug-points.util';
import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';
import { PLUG_POINTS_VARIABLE_KEY } from 'src/shared/plug/plug-points-variable-key.constant';
import { parsePlugPoints } from 'src/shared/plug/utils/parse-plug-points.util';

// Whether a plug key is saved. Its value never leaves the server.
export const isPlugKeySet = async () => ((await readApplicationVariable(CRM_SETTINGS_VARIABLE_KEYS.plugKey)) ?? '') !== '';

// The settings as the page shows them; the key always reads as unchanged.
export const readCrmSettingsForm = async (settings: CrmSettings): Promise<CrmSettingsForm> => ({
  useLeads: settings.useLeads,
  useRecurringRevenues: settings.useRecurringRevenues,
  membershipMulti: settings.membershipMulti,
  autoAssignment: settings.autoAssignment,
  autoAssignmentAction: settings.autoAssignmentAction,
  intervalNumber: settings.intervalNumber,
  intervalType: settings.intervalType,
  nextRun: settings.nextRun,
  plsRebuildCron: settings.plsRebuildCron,
  plugPoints: formPlugPoints(parsePlugPoints(await readApplicationVariable(PLUG_POINTS_VARIABLE_KEY))),
  plugKey: null,
});
