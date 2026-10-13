import { describe, expect, it } from 'vitest';

import { countBy } from 'src/shared/utils/count-by.util';

describe('countBy', () => {
  it('counts the items of each key', () => {
    expect(countBy([{ lotId: 'a' }, { lotId: 'b' }, { lotId: 'a' }], (row) => row.lotId)).toEqual(
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
  });
});
