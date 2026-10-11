import { describe, expect, it } from 'vitest';

import { snoozeUntil } from 'src/stock/orderpoint/utils/snooze-until.util';

describe('snoozeUntil', () => {
  it('adds a day, a week or a calendar month to today', () => {
    expect(snoozeUntil('DAY', '2026-01-31')).toBe('2026-02-01');
    expect(snoozeUntil('WEEK', '2026-01-31')).toBe('2026-02-07');
    expect(snoozeUntil('MONTH', '2026-01-31')).toBe('2026-02-28');
  });

  it('a month from the end of January lands on 29 February in a leap year', () => {
    expect(snoozeUntil('MONTH', '2028-01-31')).toBe('2028-02-29');
    expect(snoozeUntil('MONTH', '2028-02-29')).toBe('2028-03-29');
  });

  it('a week runs across the end of a month and of a year', () => {
    expect(snoozeUntil('WEEK', '2028-02-26')).toBe('2028-03-04');
    expect(snoozeUntil('WEEK', '2026-02-26')).toBe('2026-03-05');
    expect(snoozeUntil('WEEK', '2026-12-28')).toBe('2027-01-04');
  });

  it('leaves a custom date to the person', () => {
    expect(snoozeUntil('CUSTOM', '2026-01-31')).toBeNull();
  });
});
