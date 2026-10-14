// How a field counts as set: a link or an empty-able value is `defined` / `filled`, a number must be above zero,
// a flag must be on, and a list of link rows (equipment, extra workers) is counted by code, never by a rule.
export type StageRuleCheck = 'defined' | 'filled' | 'positive' | 'true' | 'link';
