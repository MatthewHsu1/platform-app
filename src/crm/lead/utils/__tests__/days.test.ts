import { describe, expect, it } from 'vitest';

import { wholeDaysBetween, withoutMilliseconds } from 'src/crm/lead/utils/days.util';

describe('wholeDaysBetween', () => {
  it('counts only whole days', () => {
    expect(wholeDaysBetween('2026-10-01T10:00:00.000Z', '2026-10-02T09:59:00.000Z')).toBe(0);
    expect(wholeDaysBetween('2026-10-01T10:00:00.000Z', '2026-10-02T10:00:00.000Z')).toBe(1);
  });

  it('is empty when a date is missing', () => {
    expect(wholeDaysBetween(null, '2026-10-02T10:00:00.000Z')).toBeNull();
    expect(wholeDaysBetween('2026-10-01T10:00:00.000Z', null)).toBeNull();
  });

  it('counts a date before the start as a positive number of days, rounding the gap down first', () => {
    expect(wholeDaysBetween('2026-10-02T10:00:00.000Z', '2026-10-02T09:00:00.000Z')).toBe(1);
  });
});

describe('withoutMilliseconds', () => {
  it('cuts the milliseconds off a time', () => {
    expect(withoutMilliseconds('2026-10-01T10:00:00.900Z')).toBe('2026-10-01T10:00:00.000Z');
  });
});
