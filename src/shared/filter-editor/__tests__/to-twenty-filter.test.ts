import { describe, expect, it, vi } from 'vitest';

import { FilterError, MATCH_NOTHING_FILTER, toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { type FilterCatalogueEntry } from 'src/shared/filter-editor/types/filter-catalogue-entry.type';
import { type OneHopLookup } from 'src/shared/filter-editor/types/one-hop-lookup.type';

const TEXT_OPERATORS = ['=', '!=', 'contains', 'doesNotContain', 'beginsWith', 'endsWith', 'in', 'notIn', 'null', 'notNull'] as const;
const NUMBER_OPERATORS = ['=', '!=', '<', '<=', '>', '>=', 'between', 'null', 'notNull'] as const;
const CHOICE_OPERATORS = ['=', '!=', 'in', 'notIn', 'null', 'notNull'] as const;

const CATALOGUE: FilterCatalogueEntry[] = [
  { name: 'name', label: 'Name', kind: 'text', operators: [...TEXT_OPERATORS] },
  { name: 'emailFrom.primaryEmail', label: 'Email', kind: 'text', operators: [...TEXT_OPERATORS] },
  { name: 'probability', label: 'Probability', kind: 'number', operators: [...NUMBER_OPERATORS] },
  { name: 'expectedRevenue', label: 'Expected revenue', kind: 'currency', operators: [...NUMBER_OPERATORS] },
  { name: 'createdAt', label: 'Created', kind: 'date', operators: [...NUMBER_OPERATORS] },
  { name: 'leadType', label: 'Type', kind: 'select', operators: [...CHOICE_OPERATORS], options: ['LEAD', 'OPPORTUNITY'] },
  { name: 'tags', label: 'Tags', kind: 'multiSelect', operators: ['containsAny', 'null', 'notNull'] },
  {
    name: 'stage',
    label: 'Stage',
    kind: 'relation',
    operators: [...CHOICE_OPERATORS],
    relation: { objectSingular: 'crmStage', objectPlural: 'crmStages', labelField: 'name', labelKind: 'text' },
  },
  {
    name: 'company.name',
    label: 'Customer: name',
    kind: 'text',
    operators: [...TEXT_OPERATORS],
    hop: { relationField: 'company', objectSingular: 'company', objectPlural: 'companies', field: 'name', kind: 'text' },
  },
];

const noLookup: OneHopLookup = async () => {
  throw new Error('no lookup expected');
};

const rule = (field: string, operator: string, value?: unknown) => ({ field, operator, valueSource: 'value', value });
const group = (rules: unknown[], combinator = 'and', not = false) => ({ combinator, not, rules });
const translate = (query: unknown, lookup: OneHopLookup = noLookup) => toTwentyFilter(query, CATALOGUE, lookup);

const TEXT_EMPTY = { or: [{ name: { is: 'NULL' } }, { name: { eq: '' } }] };

describe('toTwentyFilter', () => {
  it('reads an empty field, an empty text or a group without rules as no filter', async () => {
    expect(await translate(null)).toBeNull();
    expect(await translate('')).toBeNull();
    expect(await translate(group([]))).toBeNull();
    expect(await translate(JSON.stringify(group([])))).toBeNull();
  });

  it('accepts the stored JSON text as well as a parsed query', async () => {
    const query = group([rule('name', '=', 'Acme')]);

    expect(await translate(JSON.stringify(query))).toEqual({ name: { eq: 'Acme' } });
    expect(await translate(query)).toEqual({ name: { eq: 'Acme' } });
  });

  it('lets a negative operator also match an empty value', async () => {
    expect(await translate(group([rule('name', '!=', 'Acme')]))).toEqual({
      or: [{ name: { neq: 'Acme' } }, TEXT_EMPTY],
    });
    expect(await translate(group([rule('name', 'doesNotContain', 'gym')]))).toEqual({
      or: [{ not: { name: { ilike: '%gym%' } } }, TEXT_EMPTY],
    });
    expect(await translate(group([rule('leadType', 'notIn', ['LEAD'])]))).toEqual({
      or: [{ not: { leadType: { in: ['LEAD'] } } }, { leadType: { is: 'NULL' } }],
    });
  });

  it('nests a composite field and escapes the wildcard characters a user types', async () => {
    expect(await translate(group([rule('emailFrom.primaryEmail', 'contains', 'a_b%')]))).toEqual({
      emailFrom: { primaryEmail: { ilike: '%a\\_b\\%%' } },
    });
    expect(await translate(group([rule('name', 'beginsWith', 'Gym')]))).toEqual({ name: { ilike: 'Gym%' } });
    expect(await translate(group([rule('name', 'endsWith', 'Ltd')]))).toEqual({ name: { ilike: '%Ltd' } });
  });

  it('compares numbers, money in currency units and dates', async () => {
    expect(await translate(group([rule('probability', '>=', '10')]))).toEqual({ probability: { gte: 10 } });
    expect(await translate(group([rule('probability', '<', 50)]))).toEqual({ probability: { lt: 50 } });
    expect(await translate(group([rule('expectedRevenue', '>', '1.5')]))).toEqual({
      expectedRevenue: { amountMicros: { gt: 1_500_000 } },
    });
    expect(await translate(group([rule('createdAt', '<=', '2026-10-01')]))).toEqual({
      createdAt: { lte: '2026-10-01' },
    });
    expect(await translate(group([rule('probability', 'between', '10,20')]))).toEqual({
      and: [{ probability: { gte: 10 } }, { probability: { lte: 20 } }],
    });
    expect(await translate(group([rule('probability', 'between', [10, 20])]))).toEqual({
      and: [{ probability: { gte: 10 } }, { probability: { lte: 20 } }],
    });
  });

  it('filters a relation on its join column', async () => {
    expect(await translate(group([rule('stage', '=', 's1')]))).toEqual({ stageId: { in: ['s1'] } });
    expect(await translate(group([rule('stage', '!=', 's1')]))).toEqual({
      or: [{ not: { stageId: { in: ['s1'] } } }, { stageId: { is: 'NULL' } }],
    });
    expect(await translate(group([rule('stage', 'in', ['s1', 's2'])]))).toEqual({ stageId: { in: ['s1', 's2'] } });
    expect(await translate(group([rule('stage', 'null')]))).toEqual({ stageId: { is: 'NULL' } });
  });

  it('matches no lead for "is one of" an empty list and every lead for "is none of" an empty list', async () => {
    expect(await translate(group([rule('leadType', 'in', [])]))).toEqual(MATCH_NOTHING_FILTER);
    expect(await translate(group([rule('leadType', 'notIn', '')]))).toBeNull();
  });

  it('reads empty text and an empty tag list as empty', async () => {
    expect(await translate(group([rule('name', 'null')]))).toEqual(TEXT_EMPTY);
    expect(await translate(group([rule('name', 'notNull')]))).toEqual({
      and: [{ name: { is: 'NOT_NULL' } }, { name: { neq: '' } }],
    });
    expect(await translate(group([rule('probability', 'notNull')]))).toEqual({ probability: { is: 'NOT_NULL' } });
    expect(await translate(group([rule('tags', 'containsAny', ['VIP', 'GYM'])]))).toEqual({
      tags: { containsAny: ['VIP', 'GYM'] },
    });
    expect(await translate(group([rule('tags', 'null')]))).toEqual({
      or: [{ tags: { is: 'NULL' } }, { tags: { isEmptyArray: true } }],
    });
    expect(await translate(group([rule('tags', 'notNull')]))).toEqual({
      and: [{ tags: { is: 'NOT_NULL' } }, { not: { tags: { isEmptyArray: true } } }],
    });
  });

  it('keeps and and or groups, and turns a not group into the opposite conditions', async () => {
    const query = group(
      [rule('leadType', '=', 'LEAD'), group([rule('probability', '>', 50), rule('name', 'contains', 'gym')], 'or', true)],
      'and',
    );

    expect(await translate(query)).toEqual({
      and: [
        { leadType: { eq: 'LEAD' } },
        { and: [{ probability: { lte: 50 } }, { or: [{ not: { name: { ilike: '%gym%' } } }, TEXT_EMPTY] }] },
      ],
    });
  });

  it('lets a not group match a lead whose field is empty, as "is not" does', async () => {
    expect(await translate(group([rule('name', '=', 'Acme')], 'and', true))).toEqual({
      or: [{ name: { neq: 'Acme' } }, TEXT_EMPTY],
    });
    expect(await translate(group([rule('stage', '=', 's1')], 'and', true))).toEqual({
      or: [{ not: { stageId: { in: ['s1'] } } }, { stageId: { is: 'NULL' } }],
    });
    expect(await translate(group([rule('tags', 'containsAny', ['VIP'])], 'and', true))).toEqual({
      or: [{ not: { tags: { containsAny: ['VIP'] } } }, { or: [{ tags: { is: 'NULL' } }, { tags: { isEmptyArray: true } }] }],
    });
    expect(await translate(group([rule('name', 'null')], 'and', true))).toEqual({
      and: [{ name: { is: 'NOT_NULL' } }, { name: { neq: '' } }],
    });
  });

  it('negates a range as below or above it, and a not inside a not cancels out', async () => {
    expect(await translate(group([rule('probability', 'between', '10,20')], 'and', true))).toEqual({
      or: [{ probability: { lt: 10 } }, { probability: { gt: 20 } }],
    });
    expect(await translate(group([group([rule('name', '=', 'Acme')], 'and', true)], 'and', true))).toEqual({ name: { eq: 'Acme' } });
  });

  it('treats an empty inner group as matching everything', async () => {
    expect(await translate(group([rule('leadType', '=', 'LEAD'), group([])], 'or'))).toBeNull();
    expect(await translate(group([rule('leadType', '=', 'LEAD'), group([])], 'and'))).toEqual({ leadType: { eq: 'LEAD' } });
    expect(await translate(group([group([], 'and', true)]))).toEqual(MATCH_NOTHING_FILTER);
  });

  it('turns a condition on a related record into a list of its ids', async () => {
    const lookup = vi.fn<OneHopLookup>(async () => ['c1', 'c2']);

    expect(await translate(group([rule('company.name', 'contains', 'gym')]), lookup)).toEqual({
      companyId: { in: ['c1', 'c2'] },
    });
    expect(lookup).toHaveBeenCalledWith(
      { relationField: 'company', objectSingular: 'company', objectPlural: 'companies', field: 'name', kind: 'text' },
      { name: { ilike: '%gym%' } },
    );
  });

  it('matches no lead when no related record meets the condition', async () => {
    expect(await translate(group([rule('company.name', '=', 'Nobody')]), async () => [])).toEqual(MATCH_NOTHING_FILTER);
  });

  it('refuses an unknown field, an operator the field does not take and a value of the wrong type', async () => {
    await expect(translate(group([rule('budget', '=', 1)]))).rejects.toThrow(FilterError);
    await expect(translate(group([rule('budget', '=', 1)]))).rejects.toThrow('Unknown field "budget".');
    await expect(translate(group([rule('budget', '=', 1)]))).rejects.toMatchObject({ code: 'unknownField', values: { field: 'budget' } });
    await expect(translate(group([rule('tags', '=', 'VIP')]))).rejects.toMatchObject({
      code: 'operatorNotAllowed',
      values: { field: 'Tags', operator: '=' },
    });
    await expect(translate(group([rule('tags', '=', 'VIP')]))).rejects.toThrow('"Tags" cannot use "=".');
    await expect(translate(group([rule('probability', '>', 'abc')]))).rejects.toThrow('"Probability" needs a number.');
    await expect(translate(group([rule('probability', 'between', '10')]))).rejects.toThrow('"Probability" needs two numbers.');
    await expect(translate(group([rule('createdAt', '<', 'soon')]))).rejects.toThrow('"Created" needs a date.');
    await expect(translate('{not json')).rejects.toThrow('The filter is not valid JSON.');
    await expect(translate({ combinator: 'and' })).rejects.toThrow('The filter has no list of conditions.');
  });
});
