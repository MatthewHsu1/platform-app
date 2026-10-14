import { STAGE_RULE_FIELDS } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { type StageRequirementPlan } from 'src/fieldservice-stage-validation/types/stage-requirement-plan.type';
import { type StageRuleRow } from 'src/fieldservice-stage-validation/types/stage-rule-row.type';
import { isFieldSet } from 'src/fieldservice-stage-validation/utils/is-field-set.util';
import { stageNameOf } from 'src/fieldservice-stage-validation/utils/stage-name-of.util';

// The rows of the order's stage add up to the fields it needs. The first needed field (in the list's order)
// that is empty on the order stops the move. An option no longer in the list is ignored.
export const planStageRequirements = ({
  stage,
  rules,
  values,
}: {
  stage: string | null;
  rules: StageRuleRow[];
  values: Record<string, unknown>;
}): StageRequirementPlan => {
  if (stage === null) {
    return { kind: 'ok' };
  }
  const needed = new Set(rules.filter((rule) => rule.stage === stage).flatMap((rule) => rule.requiredFields ?? []));
  const missing = STAGE_RULE_FIELDS.find((entry) => needed.has(entry.value) && !isFieldSet(values[entry.field]));

  return missing === undefined ? { kind: 'ok' } : { kind: 'missing', stageName: stageNameOf(stage), fieldLabel: missing.label };
};
