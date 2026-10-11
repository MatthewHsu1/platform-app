import { describe, expect, it } from 'vitest';

import { nextCountDate } from 'src/stock/utils/next-count-date.util';

const base = { usage: 'INTERNAL' as const, nextInventoryDate: null, annualInventoryMonth: 12, annualInventoryDay: 31 };

describe('nextCountDate', () => {
  it('is this year\'s yearly count date while it is still ahead', () => {
    expect(nextCountDate({ ...base, today: '2026-10-08' })).toBe('2026-12-31');
  });

  it('moves to next year when the yearly date is today or past', () => {
    expect(nextCountDate({ ...base, today: '2026-12-31' })).toBe('2027-12-31');
    expect(nextCountDate({ ...base, annualInventoryMonth: 10, annualInventoryDay: 8, today: '2026-10-08' })).toBe('2027-10-08');
  });

  it('uses the last day of a short month, also in next year\'s February', () => {
    expect(nextCountDate({ ...base, annualInventoryMonth: 2, annualInventoryDay: 31, today: '2027-01-10' })).toBe('2027-02-28');
    expect(nextCountDate({ ...base, annualInventoryMonth: 2, annualInventoryDay: 29, today: '2028-03-01' })).toBe('2029-02-28');
    expect(nextCountDate({ ...base, annualInventoryMonth: 6, annualInventoryDay: 0, today: '2026-01-01' })).toBe('2026-06-01');
  });

  it('takes the earlier of the location date and the yearly date', () => {
    expect(nextCountDate({ ...base, nextInventoryDate: '2026-11-01', today: '2026-10-08' })).toBe('2026-11-01');
    expect(nextCountDate({ ...base, nextInventoryDate: '2027-03-01', today: '2026-10-08' })).toBe('2026-12-31');
  });

  it('has no yearly date when the month is 0, and none outside internal and transit locations', () => {
    expect(nextCountDate({ ...base, annualInventoryMonth: 0, today: '2026-10-08' })).toBeNull();
    expect(nextCountDate({ ...base, annualInventoryMonth: 0, nextInventoryDate: '2026-11-01', today: '2026-10-08' })).toBe('2026-11-01');
    expect(nextCountDate({ ...base, usage: 'CUSTOMER', today: '2026-10-08' })).toBeNull();
  });
});
