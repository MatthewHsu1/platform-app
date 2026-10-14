import { loadAllStageRules } from 'src/fieldservice-stage-validation/load-stage-rules';
import { readOrderObject } from 'src/fieldservice-stage-validation/read-order-object';
import { type SkippedField } from 'src/fieldservice-stage-validation/types/skipped-field.type';
import { validationRuleApi } from 'src/fieldservice-stage-validation/validation-rule-api';
import { diffValidationRules } from 'src/fieldservice-stage-validation/utils/diff-validation-rules.util';
import { planValidationRules } from 'src/fieldservice-stage-validation/utils/plan-validation-rules.util';

export type StageRuleSyncResult = { enabled: boolean; skipped: (SkippedField & { rowId: string })[] };

// Brings the validation rules of the service order to the stage rule rows: one rule for each field of each row,
// so Twenty refuses the save itself. Safe to repeat: it changes only what differs, and only rules with its own
// name prefix. When the workspace has validation rules off nothing is made, and the order trigger checks the
// moves after the save instead.
export const syncStageValidationRules = async (): Promise<StageRuleSyncResult> => {
  const { objectId, fields } = await readOrderObject();

  if (!(await validationRuleApi.isEnabled(objectId))) {
    return { enabled: false, skipped: [] };
  }
  const { rules, skipped } = planValidationRules(await loadAllStageRules(), fields);
  const diff = diffValidationRules(await validationRuleApi.list(objectId), rules);

  // Removals and updates first, so a renamed rule never meets its old twin.
  for (const id of diff.remove) {
    await validationRuleApi.remove(id);
  }
  for (const rule of diff.update) {
    await validationRuleApi.update(rule);
  }
  for (const rule of diff.create) {
    await validationRuleApi.create(objectId, rule);
  }
  return { enabled: true, skipped };
};
