import { type OrderFieldInfo } from 'src/fieldservice-stage-validation/types/order-field-info.type';
import { type StageRequirementPlan } from 'src/fieldservice-stage-validation/types/stage-requirement-plan.type';
import { type StageRuleRow } from 'src/fieldservice-stage-validation/types/stage-rule-row.type';
import { isFieldSet } from 'src/fieldservice-stage-validation/utils/is-field-set.util';
import { requiredFieldsOf } from 'src/fieldservice-stage-validation/utils/required-fields-of.util';
import { stageNameOf } from 'src/fieldservice-stage-validation/utils/stage-name-of.util';

// The first needed field (in the order of `requiredFieldsOf`) that is empty on the order stops the move. With
// `linksOnly` only the lists of link rows are checked: a validation rule already holds every other field.
export const planStageRequirements = ({
  stage,
  rules,
  values,
  fieldInfo = [],
  linksOnly = false,
}: {
  stage: string | null;
  rules: StageRuleRow[];
  values: Record<string, unknown>;
  fieldInfo?: OrderFieldInfo[];
  linksOnly?: boolean;
}): StageRequirementPlan => {
  if (stage === null) {
    return { kind: 'ok' };
  }
  const { fields } = requiredFieldsOf(
    rules.filter((rule) => rule.stage === stage),
    fieldInfo,
  );
  const missing = fields.find((entry) => (!linksOnly || entry.check === 'link') && !isFieldSet(values[entry.field]));

  return missing === undefined ? { kind: 'ok' } : { kind: 'missing', stageName: stageNameOf(stage), fieldLabel: missing.label };
};
