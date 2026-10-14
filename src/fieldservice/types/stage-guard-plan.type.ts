export type StageGuardPlan = {
  putBackTo: 'OPEN' | 'COMPLETED' | 'CANCELLED' | null;
  note: 'manual-complete-refused' | null;
};
