import { describe, expect, it } from 'vitest';

import { addMonths, dayOf, endOfDay, startOfDay } from 'src/stock/orderpoint/utils/day.util';

describe('day helpers', () => {
  it('adds months and clamps to the month end, as a calendar month does', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2025-08-14', -1)).toBe('2025-07-14');
  });

  it('reads the UTC day of a date-time and the bounds of a day', () => {
    expect(dayOf('2025-09-17T23:30:00.000Z')).toBe('2025-09-17');
    expect(startOfDay('2025-09-17')).toBe('2025-09-17T00:00:00.000Z');
    expect(endOfDay('2025-09-17')).toBe('2025-09-17T23:59:59.999Z');
  });
});
