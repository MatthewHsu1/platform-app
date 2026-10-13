import { describe, expect, it } from 'vitest';

import { weightedPick } from 'src/crm/assignment/utils/weighted-pick.util';

const fixed = (value: number) => () => value;

describe('weightedPick', () => {
  it('draws on the running total of the weights', () => {
    expect(weightedPick([30, 60], fixed(0))).toBe(0);
    expect(weightedPick([30, 60], fixed(0.3))).toBe(0);
    expect(weightedPick([30, 60], fixed(1 / 3))).toBe(1);
    expect(weightedPick([30, 60], fixed(0.99))).toBe(1);
  });

  it('never draws an item of weight zero', () => {
    expect(weightedPick([10, 0, 5], fixed(10 / 15))).toBe(2);
    expect(weightedPick([10, 0, 5], fixed(0.7))).toBe(2);
  });

  it('refuses a list with no weight at all', () => {
    expect(() => weightedPick([0, 0], fixed(0.5))).toThrow('positive total weight');
  });
});
