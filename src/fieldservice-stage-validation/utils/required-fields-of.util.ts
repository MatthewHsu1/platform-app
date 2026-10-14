import { STAGE_RULE_FIELDS } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { type OrderFieldInfo } from 'src/fieldservice-stage-validation/types/order-field-info.type';
import { type RequiredFields } from 'src/fieldservice-stage-validation/types/required-fields.type';
import { type StageRuleRow } from 'src/fieldservice-stage-validation/types/stage-rule-row.type';
import { resolveOtherField } from 'src/fieldservice-stage-validation/utils/resolve-other-field.util';
import { splitFieldNames } from 'src/fieldservice-stage-validation/utils/split-field-names.util';

// The fields the rows of one stage add up to: the listed fields in the list's order, then the fields staff named,
// each once. An option no longer in the list is ignored. A named field that cannot be checked is reported.
export const requiredFieldsOf = (rows: StageRuleRow[], fieldInfo: OrderFieldInfo[]): RequiredFields => {
  const listed = new Set(rows.flatMap((row) => row.requiredFields ?? []));
  const fields = STAGE_RULE_FIELDS.filter((entry) => listed.has(entry.value));
  const skipped: RequiredFields['skipped'] = [];

  for (const name of new Set(rows.flatMap((row) => splitFieldNames(row.otherFields)))) {
    const resolved = resolveOtherField(name, fieldInfo);

    if (resolved.kind === 'skipped') {
      skipped.push({ name, reason: resolved.reason });
    } else if (!fields.some((entry) => entry.field === resolved.field.field)) {
      fields.push(resolved.field);
    }
  }
  return { fields, skipped };
};
