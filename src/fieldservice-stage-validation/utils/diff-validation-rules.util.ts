import { STAGE_RULE_VALIDATION_PREFIX } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-options.constant';
import { type ValidationRuleDiff } from 'src/fieldservice-stage-validation/types/validation-rule-diff.type';
import { type ValidationRuleText } from 'src/fieldservice-stage-validation/types/validation-rule-text.type';

// The stored rules the sync keeps are the ones with its name prefix: missing ones are made, changed ones updated,
// and ones no rule row asks for any more removed. A rule with any other name is never touched.
export const diffValidationRules = (stored: (ValidationRuleText & { id: string })[], wanted: ValidationRuleText[]): ValidationRuleDiff => {
  const kept = stored.filter((rule) => rule.name.startsWith(STAGE_RULE_VALIDATION_PREFIX));
  const wantedNames = new Set(wanted.map((rule) => rule.name));

  return {
    create: wanted.filter((rule) => !kept.some((existing) => existing.name === rule.name)),
    update: kept.flatMap((existing) => {
      const rule = wanted.find((candidate) => candidate.name === existing.name);

      return rule !== undefined && (rule.expression !== existing.expression || rule.message !== existing.message) ? [{ id: existing.id, ...rule }] : [];
    }),
    remove: kept.filter((existing) => !wantedNames.has(existing.name)).map((existing) => existing.id),
  };
};
