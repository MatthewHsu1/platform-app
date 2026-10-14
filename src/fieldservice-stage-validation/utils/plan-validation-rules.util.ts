import { STAGE_RULE_VALIDATION_PREFIX } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { STAGE_VALIDATION_MESSAGES } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-messages.constant';
import { type OrderFieldInfo } from 'src/fieldservice-stage-validation/types/order-field-info.type';
import { type SkippedField } from 'src/fieldservice-stage-validation/types/skipped-field.type';
import { type StageRuleCheck } from 'src/fieldservice-stage-validation/types/stage-rule-check.type';
import { type StageRuleRow } from 'src/fieldservice-stage-validation/types/stage-rule-row.type';
import { type ValidationRuleText } from 'src/fieldservice-stage-validation/types/validation-rule-text.type';
import { requiredFieldsOf } from 'src/fieldservice-stage-validation/utils/required-fields-of.util';
import { stageNameOf } from 'src/fieldservice-stage-validation/utils/stage-name-of.util';
import { translate } from 'src/shared/i18n/translate';

const CONDITION: Record<Exclude<StageRuleCheck, 'link'>, (name: string) => string> = {
  defined: (name) => `isDefined(${name})`,
  filled: (name) => `not isEmpty(${name})`,
  positive: (name) => `${name} > 0`,
  true: (name) => `${name} == true`,
};

// One validation rule for each field of each rule row: outside the row's stage it holds, inside it the field must
// be set, and its message names the stage and the field. A list of link rows has no rule (code checks those).
// The rule fires on every save of the order, so an order already in the stage cannot be saved with a field empty.
export const planValidationRules = (
  rows: StageRuleRow[],
  fieldInfo: OrderFieldInfo[],
): { rules: ValidationRuleText[]; skipped: (SkippedField & { rowId: string })[] } => {
  const rules: ValidationRuleText[] = [];
  const skipped: (SkippedField & { rowId: string })[] = [];

  for (const row of rows) {
    if (row.stage === null) {
      continue;
    }
    const required = requiredFieldsOf([row], fieldInfo);

    skipped.push(...required.skipped.map((entry) => ({ ...entry, rowId: row.id })));
    for (const field of required.fields) {
      if (field.check !== 'link') {
        rules.push({
          name: `${STAGE_RULE_VALIDATION_PREFIX}${row.id}:${field.value}`,
          expression: `stage != "${row.stage}" or ${CONDITION[field.check](field.ruleName)}`,
          message: translate(null, STAGE_VALIDATION_MESSAGES.fieldMissing, { stage: stageNameOf(row.stage), field: field.label }),
        });
      }
    }
  }
  return { rules, skipped };
};
