import { type PlugPointsConfig } from 'src/shared/plug/types/plug-points-config.type';

// What the CRM settings page shows and sends back. The plug key is never
// shown: null means "unchanged", an empty text clears it.
export type CrmSettingsForm = {
  useLeads: boolean;
  useRecurringRevenues: boolean;
  membershipMulti: boolean;
  autoAssignment: boolean;
  autoAssignmentAction: 'MANUAL' | 'AUTO';
  intervalNumber: number;
  intervalType: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  nextRun: string | null;
  plsRebuildCron: boolean;
  plugPoints: PlugPointsConfig;
  plugKey: string | null;
};
