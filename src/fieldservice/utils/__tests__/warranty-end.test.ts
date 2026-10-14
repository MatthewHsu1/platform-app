import { describe, expect, it } from 'vitest';

import { warrantyEnd } from 'src/fieldservice/utils/warranty-end.util';

describe('warrantyEnd', () => {
  it('adds a year across a leap boundary and clamps a negative length to the start', () => {
    expect(warrantyEnd('2026-10-12T00:00:00.000Z', 1, 'year')).toBe('2027-10-12T00:00:00.000Z');
    expect(warrantyEnd('2026-10-12T00:00:00.000Z', -3, 'day')).toBe('2026-10-12T00:00:00.000Z');
  });
});
