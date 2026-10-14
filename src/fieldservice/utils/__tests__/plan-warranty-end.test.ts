import { describe, expect, it } from 'vitest';

import { planWarrantyEnd, warrantyDatesValid } from 'src/fieldservice/utils/plan-warranty-end.util';

describe('planWarrantyEnd', () => {
  it('ends a two-year warranty two years after its start', () => {
    expect(planWarrantyEnd({ startDate: '2026-03-15', length: 2, unit: 'YEAR', today: '2026-10-13' })).toBe('2028-03-15');
  });

  it('counts weeks and days', () => {
    expect(planWarrantyEnd({ startDate: '2026-03-15', length: 2, unit: 'WEEK', today: '2026-10-13' })).toBe('2026-03-29');
    expect(planWarrantyEnd({ startDate: '2026-03-15', length: 10, unit: 'DAY', today: '2026-10-13' })).toBe('2026-03-25');
  });

  it('ends a warranty without a length today', () => {
    expect(planWarrantyEnd({ startDate: '2026-03-15', length: 0, unit: 'MONTH', today: '2026-10-13' })).toBe('2026-10-13');
  });

  it('leaves the end alone without a start', () => {
    expect(planWarrantyEnd({ startDate: null, length: 12, unit: 'MONTH', today: '2026-10-13' })).toBeNull();
  });
});

describe('warrantyDatesValid', () => {
  it('refuses an end before the start and accepts the same day', () => {
    expect(warrantyDatesValid('2026-03-15', '2026-03-14')).toBe(false);
    expect(warrantyDatesValid('2026-03-15', '2026-03-15')).toBe(true);
    expect(warrantyDatesValid('2026-03-15', null)).toBe(true);
  });
});
