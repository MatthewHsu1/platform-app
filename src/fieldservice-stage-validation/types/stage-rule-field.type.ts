import { type StageRuleCheck } from 'src/fieldservice-stage-validation/types/stage-rule-check.type';

// One order field a stage rule may require. `value` is the option staff pick (or the field name for a field staff
// added), `field` the key of the order's stored value, `ruleName` the name a validation rule uses and `selection`
// what a read must ask for to get it (nothing for a list of link rows).
export type StageRuleField = {
  value: string;
  label: string;
  field: string;
  ruleName: string;
  selection: string;
  check: StageRuleCheck;
};
