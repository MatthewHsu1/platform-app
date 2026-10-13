import { describe, expect, it } from 'vitest';

import { hoursPerDay } from 'src/resource/utils/hours-per-day.util';
import { JOHN, JULES, PATEL, STANDARD_LINES } from 'src/resource/utils/__tests__/calendar-fixtures';

describe('hoursPerDay', () => {
  it('divides the hours of a week, lunch left out, by the working days of that week', () => {
    expect(hoursPerDay(false, STANDARD_LINES('std'))).toBe(8);
    expect(hoursPerDay(false, PATEL().attendances)).toBe(7);
    expect(hoursPerDay(false, JOHN().attendances)).toBe(10);
  });

  it('averages the two weeks of a two-week calendar, rounded to two decimals', () => {
    expect(hoursPerDay(true, JULES().attendances)).toBe(7.67);
  });

  it('gives zero when no working day is set', () => {
    expect(hoursPerDay(true, [{ dayofweek: 'MONDAY', hourFrom: 0, hourTo: 0, dayPeriod: 'MORNING', weekType: null }])).toBe(0);
  });
});
