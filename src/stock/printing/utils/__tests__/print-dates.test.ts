import { describe, expect, it } from 'vitest';

import { dateTimeInTimeZone, dayInTimeZone, isTimeZone } from 'src/stock/printing/utils/print-dates.util';

describe('print dates', () => {
  it('prints the day the reader saw: an evening in Denver is still that day', () => {
    expect(dayInTimeZone('2026-10-11T02:30:00.000Z', 'America/Denver')).toBe('2026-10-10');
    expect(dayInTimeZone('2026-10-11T02:30:00.000Z', 'UTC')).toBe('2026-10-11');
    expect(dayInTimeZone('2026-10-10T22:30:00.000Z', 'Asia/Tokyo')).toBe('2026-10-11');
  });

  it('prints nothing for a missing date', () => {
    expect(dayInTimeZone(null, 'America/Denver')).toBe('');
  });

  it('accepts IANA time zone names only', () => {
    expect(isTimeZone('America/Denver')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });

  it('prints a moment with its time as the reader saw it', () => {
    expect(dateTimeInTimeZone('2026-10-11T02:30:05.000Z', 'America/Denver')).toBe('2026-10-10 20:30:05');
    expect(dateTimeInTimeZone('2026-10-11T00:00:00.000Z', 'UTC')).toBe('2026-10-11 00:00:00');
    expect(dateTimeInTimeZone(null, 'UTC')).toBe('');
  });
});
