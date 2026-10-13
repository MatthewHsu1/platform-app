type FilterRule = { field: string; operator: string; value?: unknown };
type FilterGroup = { combinator?: string; not?: boolean; rules: (FilterRule | FilterGroup)[] };

const isGroup = (item: FilterRule | FilterGroup): item is FilterGroup => Array.isArray((item as FilterGroup).rules);

// "product.name" reads record.product.name.
const readPath = (record: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (current, key) => (current !== null && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined),
    record,
  );

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

// The editor stores what is typed in a box as text, numbers too.
const asNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

// A day picked in a date box ("2026-10-10") stands for that day at midnight UTC.
const asTime = (value: unknown) => (typeof value === 'string' && ISO_DATE.test(value) ? Date.parse(value) : Number.NaN);

// `left` is the record's value: a number field compares as numbers, a text
// field as text ("0042" is not "42").
const compare = (left: unknown, right: unknown) => {
  const rightNumber = asNumber(right);

  if (typeof left === 'number' && rightNumber !== null) {
    return left - rightNumber;
  }
  const leftTime = asTime(left);
  const rightTime = asTime(right);

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return leftTime - rightTime;
  }
  const leftText = String(left ?? '');
  const rightText = String(right ?? '');

  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
};

const listOf = (value: unknown) =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => String(item).trim())
    .filter((item) => item !== '');

const matchesRule = (rule: FilterRule, record: Record<string, unknown>) => {
  const actual = readPath(record, rule.field);

  switch (rule.operator) {
    case 'null':
      return isEmpty(actual);
    case 'notNull':
      return !isEmpty(actual);
    case '=':
      return !isEmpty(actual) && compare(actual, rule.value) === 0;
    case '!=':
      return isEmpty(actual) || compare(actual, rule.value) !== 0;
    case '<':
      return !isEmpty(actual) && compare(actual, rule.value) < 0;
    case '<=':
      return !isEmpty(actual) && compare(actual, rule.value) <= 0;
    case '>':
      return !isEmpty(actual) && compare(actual, rule.value) > 0;
    case '>=':
      return !isEmpty(actual) && compare(actual, rule.value) >= 0;
    case 'in':
      return !isEmpty(actual) && listOf(rule.value).some((item) => compare(actual, item) === 0);
    case 'notIn':
      return isEmpty(actual) || !listOf(rule.value).some((item) => compare(actual, item) === 0);
    default:
      throw new Error(`Unknown filter operator ${rule.operator}`);
  }
};

const matchesGroup = (group: FilterGroup, record: Record<string, unknown>): boolean => {
  const results = group.rules.map((item) => (isGroup(item) ? matchesGroup(item, record) : matchesRule(item, record)));
  const matched = results.length === 0 || (group.combinator === 'or' ? results.some(Boolean) : results.every(Boolean));

  return group.not === true ? !matched : matched;
};

// A saved filter-editor query: groups of rules joined by "and" or "or", each
// group negated or not. An empty or missing filter matches every record.
export const matchesFilter = (query: unknown, record: Record<string, unknown>) => {
  if (query === null || query === undefined || typeof query !== 'object' || !Array.isArray((query as FilterGroup).rules)) {
    return true;
  }

  return matchesGroup(query as FilterGroup, record);
};
