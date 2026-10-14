import { type DeleteGuardPlan } from 'src/fieldservice/types/delete-guard-plan.type';

// Deletes are only allowed while the order sits in the default stage.
export const planDeleteGuard = (stageIsDefault: boolean): DeleteGuardPlan => {
  if (stageIsDefault === false) {
    return { allow: false, note: 'delete-only-in-default-stage' };
  }
  return { allow: true, note: null };
};
