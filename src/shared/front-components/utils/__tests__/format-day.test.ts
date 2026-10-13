import { describe, expect, it } from 'vitest';

import { formatDay } from 'src/shared/front-components/utils/format-day.util';

describe('formatDay', () => {
  it('writes the day as the language writes dates', () => {
    expect(formatDay('2026-10-08', 'en-US')).toBe('Oct 8, 2026');
    expect(formatDay('2026-10-08', 'de-DE')).toBe('08.10.2026');
  });

  it('keeps the calendar day of a date-time, whatever its hour', () => {
    expect(formatDay('2026-10-08T23:30:00.000Z', 'en-US')).toBe('Oct 8, 2026');
  });

  it('shows the text as it came when it is not a date', () => {
    expect(formatDay('soon', 'en-US')).toBe('soon');
  });
});
