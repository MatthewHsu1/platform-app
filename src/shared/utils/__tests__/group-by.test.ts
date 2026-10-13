import { describe, expect, it } from 'vitest';

import { groupBy } from 'src/shared/utils/group-by.util';

describe('groupBy', () => {
  it('puts items with the same key together, in the order they came', () => {
    const links = [
      { category: 'chairs', route: 'buy' },
      { category: 'desks', route: 'make' },
      { category: 'chairs', route: 'resupply' },
    ];

    expect(groupBy(links, (link) => link.category)).toEqual(
      new Map([
        ['chairs', [links[0], links[2]]],
        ['desks', [links[1]]],
      ]),
    );
  });
});
