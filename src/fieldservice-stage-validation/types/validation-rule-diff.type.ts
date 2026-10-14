import { type ValidationRuleText } from 'src/fieldservice-stage-validation/types/validation-rule-text.type';

// What the sync does to bring the stored rules to the wanted ones.
export type ValidationRuleDiff = {
  create: ValidationRuleText[];
  update: (ValidationRuleText & { id: string })[];
  remove: string[];
};
