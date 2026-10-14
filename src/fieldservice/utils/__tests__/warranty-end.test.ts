import { describe, expect, it } from 'vitest';

import { warrantyEnd } from 'src/fieldservice/utils/warranty-end.util';

describe('warrantyEnd', () => {
  it('adds a year across a leap boundary and clamps a negative length to the start', () => {
    expect(warrantyEnd('2026-10-12T00:00:00.000Z', 1, 'year')).toBe('2027-10-12T00:00:00.000Z');
    expect(warrantyEnd('2026-10-12T00:00:00.000Z', -3, 'day')).toBe('2026-10-12T00:00:00.000Z');
  });

  it('clamps the day to the last day of the target month', () => {
    expect(warrantyEnd('2026-01-31T00:00:00.000Z', 1, 'month')).toBe('2026-02-28T00:00:00.000Z');
    expect(warrantyEnd('2024-02-29T00:00:00.000Z', 12, 'month')).toBe('2025-02-28T00:00:00.000Z');
    expect(warrantyEnd('2024-02-29T00:00:00.000Z', 1, 'year')).toBe('2025-02-28T00:00:00.000Z');
    expect(warrantyEnd('2026-08-31T10:30:00.000Z', 1, 'month')).toBe('2026-09-30T10:30:00.000Z');
  });
});
