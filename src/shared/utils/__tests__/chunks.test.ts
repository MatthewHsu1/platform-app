import { describe, expect, it } from 'vitest';

import { chunks } from 'src/shared/utils/chunks.util';

describe('chunks', () => {
  it('cuts 5 items in parts of 2: two full parts and the one left', () => {
    expect(chunks(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('gives no part for no items', () => {
    expect(chunks([], 100)).toEqual([]);
  });
});
