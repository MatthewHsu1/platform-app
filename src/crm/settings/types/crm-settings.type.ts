import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';

export type CrmSettings = {
  useLeads: boolean;
  useRecurringRevenues: boolean;
  membershipMulti: boolean;
  autoAssignment: boolean;
  autoAssignmentAction: 'MANUAL' | 'AUTO';
  intervalNumber: number;
  intervalType: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  nextRun: string | null;
  assignmentDelayHours: number;
  plsFields: PlsFieldKey[];
  plsStartDate: string | null;
  plsRebuildCron: boolean;
};
