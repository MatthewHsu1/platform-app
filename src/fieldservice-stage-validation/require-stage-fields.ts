import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';
import { loadStageRules } from 'src/fieldservice-stage-validation/load-stage-rules';
import { planStageRequirements } from 'src/fieldservice-stage-validation/utils/plan-stage-requirements.util';

// A button that moves an order into a stage asks first, with the values the order will hold after the move, so
// the user gets the reason as the answer of the click instead of a note after an undone move.
export const requireStageFields = async (stage: string, values: Record<string, unknown>) => {
  const plan = planStageRequirements({ stage, rules: await loadStageRules([stage]), values });

  if (plan.kind === 'missing') {
    throw new FieldserviceActionError(STAGE_VALIDATION_MESSAGES.fieldMissing, { stage: plan.stageName, field: plan.fieldLabel });
  }
};
