import { describe, expect, it } from 'vitest';

import { COLOR_INDEX_NAMES, pickRandomColor } from 'src/crm/color-index.constant';

describe('pickRandomColor', () => {
  it('picks the first mapped colour at the bottom of the random range', () => {
    expect(pickRandomColor(() => 0)).toBe('red');
  });

  it('picks the last mapped colour at the top of the random range', () => {
    expect(pickRandomColor(() => 0.9999)).toBe('gray');
  });

  it('can pick every one of the eleven colours', () => {
    const picked = new Set(Array.from({ length: 11 }, (_, index) => pickRandomColor(() => (index + 0.5) / 11)));

    expect([...picked].sort()).toEqual(Object.values(COLOR_INDEX_NAMES).sort());
  });
});
