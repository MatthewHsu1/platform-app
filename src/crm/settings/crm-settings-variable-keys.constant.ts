import { CRM_ASSIGNMENT_PLUG_POINT } from 'src/crm/assignment/plug/assignment-plug.constant';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { PLUG_POINTS_VARIABLE_KEY } from 'src/shared/plug/plug-points-variable-key.constant';
import { plugKeyVariableName } from 'src/shared/plug/utils/parse-plug-points.util';

// The app variable behind each field of the settings page.
export const CRM_SETTINGS_VARIABLE_KEYS: Record<keyof CrmSettingsForm, string> = {
  useLeads: 'CRM_USE_LEADS',
  useRecurringRevenues: 'CRM_USE_RECURRING_REVENUES',
  membershipMulti: 'SALES_TEAM_MEMBERSHIP_MULTI',
  autoAssignment: 'CRM_LEAD_AUTO_ASSIGNMENT',
  autoAssignmentAction: 'CRM_AUTO_ASSIGNMENT_ACTION',
  intervalNumber: 'CRM_AUTO_ASSIGNMENT_INTERVAL_NUMBER',
  intervalType: 'CRM_AUTO_ASSIGNMENT_INTERVAL_TYPE',
  nextRun: 'CRM_AUTO_ASSIGNMENT_NEXT_RUN',
  plsRebuildCron: 'CRM_PLS_REBUILD_CRON',
  plugPoints: PLUG_POINTS_VARIABLE_KEY,
  plugKey: plugKeyVariableName(CRM_ASSIGNMENT_PLUG_POINT),
};
