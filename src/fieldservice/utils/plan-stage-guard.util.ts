import { type StageGuardPlan } from 'src/fieldservice/types/stage-guard-plan.type';

// Only a manual move to Completed is guarded: the trigger puts the status
// back and raises a note. The Complete button path, Cancel moves, reopening,
// and an unchanged status all pass through untouched.
export const planStageGuard = (
  before: 'OPEN' | 'COMPLETED' | 'CANCELLED',
  written: 'OPEN' | 'COMPLETED' | 'CANCELLED' | undefined,
  viaCompleteButton: boolean,
): StageGuardPlan => {
  if (written === undefined || written === before) {
    return { putBackTo: null, note: null };
  }
  if (written === 'COMPLETED' && viaCompleteButton === false) {
    return { putBackTo: before, note: 'manual-complete-refused' };
  }
  return { putBackTo: null, note: null };
};
