import { describe, expect, it } from 'vitest';

import { matchesFilter } from 'src/shared/filter-editor/matches-filter';

const move = {
  productUomQty: 12,
  origin: 'SO042',
  priority: 'URGENT',
  date: '2026-10-10T12:00:00.000Z',
  product: { defaultCode: 'BELT-1', name: 'Belt' },
  category: { name: 'Belts' },
  picking: { name: 'WH/IN/00007', origin: null },
};

describe('matchesFilter', () => {
  it('matches every move when there is no filter', () => {
    expect(matchesFilter(null, move)).toBe(true);
    expect(matchesFilter({ combinator: 'and', rules: [] }, move)).toBe(true);
  });

  it('compares numbers typed as text as numbers', () => {
    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'productUomQty', operator: '>', value: '9' }] }, move)).toBe(true);
    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'productUomQty', operator: '<=', value: '9' }] }, move)).toBe(false);
  });

  it('compares a text field as text, even when it looks like a number', () => {
    const order = { origin: '0042' };

    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'origin', operator: '=', value: '42' }] }, order)).toBe(false);
    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'origin', operator: '=', value: '0042' }] }, order)).toBe(true);
  });

  it('reads one hop through the product, the category and the transfer', () => {
    expect(
      matchesFilter(
        {
          combinator: 'and',
          rules: [
            { field: 'product.defaultCode', operator: '=', value: 'BELT-1' },
            { field: 'category.name', operator: 'in', value: 'Belts,Motors' },
            { field: 'picking.origin', operator: 'null' },
          ],
        },
        move,
      ),
    ).toBe(true);
  });

  it('joins rules with or, negates a group and nests groups', () => {
    const query = {
      combinator: 'or',
      rules: [
        { field: 'priority', operator: '=', value: 'NORMAL' },
        { combinator: 'and', not: true, rules: [{ field: 'origin', operator: 'notIn', value: ['SO042'] }] },
      ],
    };
    expect(matchesFilter(query, move)).toBe(true);
    expect(matchesFilter({ ...query, not: true }, move)).toBe(false);
  });

  it('treats a missing value as not equal and not set', () => {
    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'picking.origin', operator: '!=', value: 'X' }] }, move)).toBe(true);
    expect(matchesFilter({ combinator: 'and', rules: [{ field: 'picking.origin', operator: 'notNull' }] }, move)).toBe(false);
  });

  it('reads a day picked in a date box as that day at midnight', () => {
    const dateRule = (operator: string, value: string) => ({ combinator: 'and', rules: [{ field: 'date', operator, value }] });

    expect(matchesFilter(dateRule('>', '2026-10-10'), move)).toBe(true);
    expect(matchesFilter(dateRule('<', '2026-10-11'), move)).toBe(true);
    expect(matchesFilter(dateRule('=', '2026-10-10'), move)).toBe(false);
  });

  it('finds a list that holds any of the listed values', () => {
    const query = { combinator: 'and', rules: [{ field: 'tagIds', operator: 'containsAny', value: ['a', 'b'] }] };

    expect(matchesFilter(query, { tagIds: ['b', 'c'] })).toBe(true);
    expect(matchesFilter(query, { tagIds: ['c'] })).toBe(false);
    expect(matchesFilter(query, { tagIds: [] })).toBe(false);
  });
});
