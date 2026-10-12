export type CrmSettings = {
  membershipMulti: boolean;
  autoAssignment: boolean;
  autoAssignmentAction: 'MANUAL' | 'AUTO';
  intervalNumber: number;
  intervalType: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  nextRun: string | null;
  assignmentDelayHours: number;
};
