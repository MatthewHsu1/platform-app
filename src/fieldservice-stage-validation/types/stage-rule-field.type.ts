// One order field a stage rule may require. `value` is the option staff pick, `field` the key of the order's
// stored value and `selection` what a read must ask for to get it.
export type StageRuleField = { value: string; label: string; field: string; selection: string };
