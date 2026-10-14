import { describe, expect, it } from 'vitest';

import { findHoliday } from 'src/fieldservice/utils/find-holiday.util';

const christmas = { name: 'Christmas', dateFrom: '2026-12-25T08:00:00.000Z', dateTo: '2026-12-25T17:00:00.000Z' };

describe('findHoliday', () => {
  it('finds a time off that lies wholly inside the scheduled window', () => {
    expect(findHoliday('2026-12-25T07:00:00.000Z', '2026-12-25T18:00:00.000Z', [christmas])).toEqual(christmas);
  });

  it('lets a window through that only overlaps part of the time off', () => {
    expect(findHoliday('2026-12-25T09:00:00.000Z', '2026-12-25T11:00:00.000Z', [christmas])).toBeNull();
  });

  it('counts a time off that starts and ends exactly with the window', () => {
    expect(findHoliday('2026-12-25T08:00:00.000Z', '2026-12-25T17:00:00.000Z', [christmas])).toEqual(christmas);
  });

  it('finds nothing for a window without an end', () => {
    expect(findHoliday('2026-12-25T07:00:00.000Z', null, [christmas])).toBeNull();
  });
});
