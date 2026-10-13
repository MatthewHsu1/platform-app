import { describe, expect, it } from 'vitest';

import { hasAttendanceOverlap } from 'src/resource/utils/attendance-overlap.util';
import { JEAN, JULES, STANDARD_LINES, extraLine } from 'src/resource/utils/__tests__/calendar-fixtures';

describe('hasAttendanceOverlap', () => {
  it('accepts lines that only touch, lunch included', () => {
    expect(hasAttendanceOverlap(false, STANDARD_LINES('std'))).toBe(false);
  });

  it('finds two lines of one day that overlap', () => {
    expect(hasAttendanceOverlap(false, [...JEAN().attendances, extraLine(0, 24, 'WEDNESDAY')])).toBe(true);
  });

  it('compares the lines of each week of a two-week calendar on their own', () => {
    expect(hasAttendanceOverlap(true, JULES().attendances)).toBe(false);
    expect(hasAttendanceOverlap(true, [...JULES().attendances, extraLine(9, 10, 'MONDAY', 'FIRST')])).toBe(true);
    expect(hasAttendanceOverlap(true, [...JULES().attendances, extraLine(9, 10, 'MONDAY', null)])).toBe(false);
  });

  it('refuses a line that ends where it starts or before', () => {
    expect(hasAttendanceOverlap(false, [extraLine(10, 10, 'MONDAY')])).toBe(true);
    expect(hasAttendanceOverlap(false, [extraLine(12, 10, 'MONDAY')])).toBe(true);
  });
});
