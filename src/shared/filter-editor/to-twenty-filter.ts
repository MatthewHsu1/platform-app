import { FILTER_ERROR_MESSAGES } from 'src/shared/filter-editor/filter-error-messages.constant';
import { type FilterCatalogueEntry } from 'src/shared/filter-editor/types/filter-catalogue-entry.type';
import { type FilterErrorCode } from 'src/shared/filter-editor/types/filter-error-code.type';
import { type OneHopLookup } from 'src/shared/filter-editor/types/one-hop-lookup.type';
import { escapeLike } from 'src/shared/utils/escape-like.util';

// The message is the English text; callers show `code` and `values`
// translated.
export class FilterError extends Error {
  constructor(
    readonly code: FilterErrorCode,
    readonly values: Record<string, string> = {},
  ) {
    super(FILTER_ERROR_MESSAGES[code].replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole));
    this.name = 'FilterError';
  }
}

type TwentyFilter = Record<string, unknown>;
type StoredRule = { field: string; operator: string; value?: unknown };
type StoredGroup = { combinator?: string; not?: boolean; rules: (StoredRule | StoredGroup)[] };
type ScalarEntry = Pick<FilterCatalogueEntry, 'name' | 'label' | 'kind' | 'operators'>;

// No id is null, so this condition matches no record. Used where the user's
// filter can match nothing (an empty "is one of" list).
export const MATCH_NOTHING_FILTER: TwentyFilter = { id: { is: 'NULL' } };

// A negated condition becomes its opposite operator, so "not (is Acme)"
// reads as "is not Acme" and, like it, also matches an empty field.
const OPPOSITE_OPERATORS: Record<string, string> = {
  '=': '!=',
  '!=': '=',
  in: 'notIn',
  notIn: 'in',
  contains: 'doesNotContain',
  doesNotContain: 'contains',
  null: 'notNull',
  notNull: 'null',
  '<': '>=',
  '>=': '<',
  '<=': '>',
  '>': '<=',
};

const isGroup = (item: StoredRule | StoredGroup): item is StoredGroup => Array.isArray((item as StoredGroup).rules);

const parseQuery = (query: unknown): StoredGroup | null => {
  if (query === null || query === undefined || query === '') {
    return null;
  }
  let parsed: unknown = query;

  if (typeof query === 'string') {
    try {
      parsed = JSON.parse(query);
    } catch {
      throw new FilterError('invalidJson');
    }
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as StoredGroup).rules)) {
    throw new FilterError('noConditions');
  }

  return parsed as StoredGroup;
};

const nest = (path: string, condition: unknown): TwentyFilter =>
  path.split('.').reduceRight<unknown>((inner, key) => ({ [key]: inner }), condition) as TwentyFilter;

const listOf = (value: unknown): unknown[] =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '' && item !== null && item !== undefined);

// The column a filter names: money compares on its micros, a relation on its
// join column.
const pathOf = (entry: ScalarEntry) =>
  entry.kind === 'currency' ? `${entry.name}.amountMicros` : entry.kind === 'relation' ? `${entry.name}Id` : entry.name;

const toNumber = (entry: ScalarEntry, raw: unknown) => {
  const number = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;

  if (!Number.isFinite(number)) {
    throw new FilterError('needsNumber', { field: entry.label });
  }
  return entry.kind === 'currency' ? Math.round(number * 1_000_000) : number;
};

const toValue = (entry: ScalarEntry, raw: unknown): string | number => {
  if (entry.kind === 'number' || entry.kind === 'currency') {
    return toNumber(entry, raw);
  }
  if (entry.kind === 'date') {
    const text = typeof raw === 'string' ? raw.trim() : '';

    if (text === '' || Number.isNaN(Date.parse(text))) {
      throw new FilterError('needsDate', { field: entry.label });
    }
    return text;
  }
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    throw new FilterError('needsValue', { field: entry.label });
  }
  return String(raw);
};

// Empty text is stored as an empty string, an empty tag list as an empty
// array; both read as "not set".
const emptyCondition = (entry: ScalarEntry): TwentyFilter => {
  const path = pathOf(entry);

  if (entry.kind === 'text') {
    return { or: [nest(path, { is: 'NULL' }), nest(path, { eq: '' })] };
  }
  if (entry.kind === 'multiSelect') {
    return { or: [nest(path, { is: 'NULL' }), nest(path, { isEmptyArray: true })] };
  }
  return nest(path, { is: 'NULL' });
};

const setCondition = (entry: ScalarEntry): TwentyFilter => {
  const path = pathOf(entry);

  if (entry.kind === 'text') {
    return { and: [nest(path, { is: 'NOT_NULL' }), nest(path, { neq: '' })] };
  }
  if (entry.kind === 'multiSelect') {
    return { and: [nest(path, { is: 'NOT_NULL' }), { not: nest(path, { isEmptyArray: true }) }] };
  }
  return nest(path, { is: 'NOT_NULL' });
};

// "is not", "is none of" and "does not contain" also match a record where the
// field is empty.
const orEmpty = (entry: ScalarEntry, condition: TwentyFilter): TwentyFilter => ({
  or: [condition, emptyCondition(entry)],
});

const likeText = (entry: ScalarEntry, raw: unknown) => escapeLike(String(toValue(entry, raw)));

const bounds = (entry: ScalarEntry, raw: unknown) => {
  const values = listOf(raw);

  if (values.length !== 2) {
    throw new FilterError(entry.kind === 'date' ? 'needsTwoDates' : 'needsTwoNumbers', { field: entry.label });
  }
  return [toValue(entry, values[0]), toValue(entry, values[1])];
};

// Returns null when the rule matches every record.
const translateOperator = (entry: ScalarEntry, operator: string, value: unknown): TwentyFilter | null => {
  const path = pathOf(entry);
  const isRelation = entry.kind === 'relation';

  switch (operator) {
    case '=':
      return isRelation ? nest(path, { in: [toValue(entry, value)] }) : nest(path, { eq: toValue(entry, value) });
    case '!=':
      return orEmpty(
        entry,
        isRelation ? { not: nest(path, { in: [toValue(entry, value)] }) } : nest(path, { neq: toValue(entry, value) }),
      );
    case '<':
      return nest(path, { lt: toValue(entry, value) });
    case '<=':
      return nest(path, { lte: toValue(entry, value) });
    case '>':
      return nest(path, { gt: toValue(entry, value) });
    case '>=':
      return nest(path, { gte: toValue(entry, value) });
    case 'between': {
      const [low, high] = bounds(entry, value);

      return { and: [nest(path, { gte: low }), nest(path, { lte: high })] };
    }
    case 'in': {
      const values = listOf(value).map((item) => toValue(entry, item));

      return values.length === 0 ? MATCH_NOTHING_FILTER : nest(path, { in: values });
    }
    case 'notIn': {
      const values = listOf(value).map((item) => toValue(entry, item));

      return values.length === 0 ? null : orEmpty(entry, { not: nest(path, { in: values }) });
    }
    case 'contains':
      return nest(path, { ilike: `%${likeText(entry, value)}%` });
    case 'doesNotContain':
      return orEmpty(entry, { not: nest(path, { ilike: `%${likeText(entry, value)}%` }) });
    case 'beginsWith':
      return nest(path, { ilike: `${likeText(entry, value)}%` });
    case 'endsWith':
      return nest(path, { ilike: `%${likeText(entry, value)}` });
    case 'containsAny': {
      const values = listOf(value).map(String);

      return values.length === 0 ? MATCH_NOTHING_FILTER : nest(path, { containsAny: values });
    }
    case 'null':
      return emptyCondition(entry);
    case 'notNull':
      return setCondition(entry);
    default:
      throw new FilterError('operatorNotAllowed', { field: entry.label, operator });
  }
};

// The opposite of a rule, for a rule inside a "not" group.
const translateNegatedOperator = (entry: ScalarEntry, operator: string, value: unknown): TwentyFilter | null => {
  const opposite = OPPOSITE_OPERATORS[operator];

  if (opposite !== undefined) {
    return translateOperator(entry, opposite, value);
  }
  const path = pathOf(entry);

  switch (operator) {
    case 'between': {
      const [low, high] = bounds(entry, value);

      return { or: [nest(path, { lt: low }), nest(path, { gt: high })] };
    }
    case 'beginsWith':
      return orEmpty(entry, { not: nest(path, { ilike: `${likeText(entry, value)}%` }) });
    case 'endsWith':
      return orEmpty(entry, { not: nest(path, { ilike: `%${likeText(entry, value)}` }) });
    case 'containsAny': {
      const values = listOf(value).map(String);

      return values.length === 0 ? null : orEmpty(entry, { not: nest(path, { containsAny: values }) });
    }
    default:
      throw new FilterError('operatorNotAllowed', { field: entry.label, operator });
  }
};

const translateScalarRule = (entry: ScalarEntry, rule: StoredRule, negated: boolean): TwentyFilter | null => {
  if (!entry.operators.some((operator) => operator === rule.operator)) {
    throw new FilterError('operatorNotAllowed', { field: entry.label, operator: rule.operator });
  }
  return negated ? translateNegatedOperator(entry, rule.operator, rule.value) : translateOperator(entry, rule.operator, rule.value);
};

// A condition on a related record's field becomes the list of those records'
// ids; a lead without that record never matches it.
const translateRule = async (
  rule: StoredRule,
  negated: boolean,
  catalogue: FilterCatalogueEntry[],
  lookup: OneHopLookup,
): Promise<TwentyFilter | null> => {
  const entry = catalogue.find((candidate) => candidate.name === rule.field);

  if (entry === undefined) {
    throw new FilterError('unknownField', { field: rule.field });
  }
  if (entry.hop === undefined) {
    return translateScalarRule(entry, rule, negated);
  }
  const { hop } = entry;
  const condition = translateScalarRule({ name: hop.field, label: entry.label, kind: hop.kind, operators: entry.operators }, rule, negated);
  const joinColumn = `${hop.relationField}Id`;

  if (condition === null) {
    return { [joinColumn]: { is: 'NOT_NULL' } };
  }
  const ids = await lookup(hop, condition);

  return ids.length === 0 ? MATCH_NOTHING_FILTER : { [joinColumn]: { in: ids } };
};

// A "not" group is turned inside out: each rule becomes its opposite and
// "and" swaps with "or", so the negation reaches every condition.
const translateGroup = async (
  group: StoredGroup,
  negatedFromAbove: boolean,
  catalogue: FilterCatalogueEntry[],
  lookup: OneHopLookup,
): Promise<TwentyFilter | null> => {
  const negated = negatedFromAbove !== (group.not === true);

  if (group.rules.length === 0) {
    return negated ? MATCH_NOTHING_FILTER : null;
  }
  const parts: (TwentyFilter | null)[] = [];

  for (const item of group.rules) {
    parts.push(
      isGroup(item) ? await translateGroup(item, negated, catalogue, lookup) : await translateRule(item, negated, catalogue, lookup),
    );
  }
  const isOr = (group.combinator === 'or') !== negated;

  if (isOr) {
    return parts.includes(null) ? null : parts.length === 1 ? parts[0] : { or: parts };
  }
  const kept = parts.filter((part): part is TwentyFilter => part !== null);

  return kept.length === 0 ? null : kept.length === 1 ? kept[0] : { and: kept };
};

// Turns a stored filter-editor query into a Twenty GraphQL filter. Null means
// no filter: every record matches, as an empty filter does.
export const toTwentyFilter = async (
  query: unknown,
  catalogue: FilterCatalogueEntry[],
  lookup: OneHopLookup,
): Promise<TwentyFilter | null> => {
  const group = parseQuery(query);

  return group === null ? null : translateGroup(group, false, catalogue, lookup);
};
