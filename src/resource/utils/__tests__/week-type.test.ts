import { describe, expect, it } from 'vitest';

import { weekType } from 'src/resource/utils/week-type.util';

describe('weekType', () => {
  it('alternates every week, counted from the first day of year 1', () => {
    expect(weekType({ year: 2018, month: 4, day: 2 })).toBe(1);
    expect(weekType({ year: 2018, month: 4, day: 8 })).toBe(1);
    expect(weekType({ year: 2018, month: 4, day: 9 })).toBe(0);
    expect(weekType({ year: 2018, month: 4, day: 16 })).toBe(1);
    expect(weekType({ year: 1970, month: 1, day: 1 })).toBe(1);
  });
});
