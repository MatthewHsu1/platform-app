import { describe, expect, it } from 'vitest';

import { planCalendarCreate } from 'src/resource/utils/plan-calendar-create.util';

const standard = {
  id: 'std',
  tz: 'Europe/Brussels',
  twoWeeksCalendar: false,
  lines: [{ name: 'Monday Morning', dayofweek: 'MONDAY', hourFrom: 8, hourTo: 12, dayPeriod: 'MORNING', weekType: null, sequence: 10 }],
};

describe('planCalendarCreate', () => {
  it('copies the standard calendar into a new calendar without lines', () => {
    expect(planCalendarCreate({ calendar: { id: 'c', tz: 'Asia/Tokyo', seedKey: null, lineCount: 0 }, standard, defaultTimeZone: 'America/Chicago' })).toEqual({
      kind: 'write',
      data: { tz: 'Europe/Brussels', twoWeeksCalendar: false },
      lines: [{ name: 'Monday Morning', dayofweek: 'MONDAY', hourFrom: 8, hourTo: 12, dayPeriod: 'MORNING', weekType: null, sequence: 10, calendarId: 'c' }],
    });
  });

  it('fills an empty time zone of a calendar that has lines with the default zone', () => {
    expect(planCalendarCreate({ calendar: { id: 'c', tz: null, seedKey: null, lineCount: 3 }, standard, defaultTimeZone: 'America/Chicago' })).toEqual({
      kind: 'write',
      data: { tz: 'America/Chicago' },
      lines: [],
    });
  });

  it('gives the standard calendar the default zone and copies nothing into it', () => {
    expect(
      planCalendarCreate({
        calendar: { id: 'std', tz: null, seedKey: 'resource.resource_calendar_std', lineCount: 0 },
        standard: null,
        defaultTimeZone: 'UTC',
      }),
    ).toEqual({ kind: 'write', data: { tz: 'UTC' }, lines: [] });
  });

  it('refuses an unknown time zone', () => {
    expect(planCalendarCreate({ calendar: { id: 'c', tz: 'Mars/Olympus', seedKey: null, lineCount: 2 }, standard, defaultTimeZone: 'UTC' })).toEqual({
      kind: 'refuse',
      reason: 'Choose a known time zone.',
    });
  });
});
