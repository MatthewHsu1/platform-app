import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { checkStageRequirements } from 'src/fieldservice-stage-validation/check-stage-requirements';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';

// A button that moves an order into a stage asks first, with the values the button is about to write on top of
// what the order holds, so the user gets the reason as the answer of the click.
export const requireStageFields = async (orderId: string, stage: string, changes: Record<string, unknown>) => {
  const plan = (await checkStageRequirements([{ orderId, stage, changes }], { linksOnly: false })).get(orderId);

  if (plan?.kind === 'missing') {
    throw new FieldserviceActionError(STAGE_VALIDATION_MESSAGES.fieldMissing, { stage: plan.stageName, field: plan.fieldLabel });
  }
};
