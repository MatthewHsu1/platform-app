import { describe, expect, it } from 'vitest';

import { workHoursCount } from 'src/resource/utils/work-hours-count.util';
import { JEAN, JULES, PATEL, STANDARD_LINES, calendar, leave } from 'src/resource/utils/__tests__/calendar-fixtures';

// Monday 2 April 00:00 to Friday 6 April 23:59:59 in Brussels, and the same days in UTC+6.
const WEEK = ['2018-04-01T22:00:00.000Z', '2018-04-06T21:59:59.000Z'] as const;
const PATEL_WEEK = ['2018-04-01T18:00:00.000Z', '2018-04-06T17:59:59.000Z'] as const;

describe('workHoursCount', () => {
  it('counts the working hours of a week, less the time off', () => {
    const jean = JEAN([leave('jean', '2018-04-02T22:00:00.000Z', '2018-04-03T21:59:59.000Z')]);

    expect(workHoursCount(jean, ...WEEK, true)).toBe(32);
    expect(workHoursCount(jean, ...WEEK, false)).toBe(40);
  });

  it('ignores time off of no length and of a few seconds outside working hours', () => {
    expect(workHoursCount(PATEL([leave('patel', '2018-04-02T18:00:00.000Z', '2018-04-02T18:00:00.000Z')]), ...PATEL_WEEK, true)).toBe(35);
    expect(workHoursCount(PATEL([leave('patel', '2018-04-02T18:00:00.000Z', '2018-04-02T18:00:10.000Z')]), ...PATEL_WEEK, true)).toBe(35);
  });

  it('takes out a morning of time off, and time off that crosses midnight', () => {
    expect(workHoursCount(PATEL([leave('patel', '2018-04-03T03:00:00.000Z', '2018-04-03T06:00:00.000Z')]), ...PATEL_WEEK, true)).toBe(32);
    expect(workHoursCount(PATEL([leave('patel', '2018-04-03T04:00:00.000Z', '2018-04-04T04:00:00.000Z')]), ...PATEL_WEEK, true)).toBe(28);
  });

  it('counts time off without a calendar for every calendar', () => {
    expect(workHoursCount(PATEL([leave(null, '2018-04-03T03:00:00.000Z', '2018-04-03T06:00:00.000Z')]), ...PATEL_WEEK, true)).toBe(32);
  });

  it('gives zero when the end comes before the start', () => {
    expect(workHoursCount(PATEL(), '2018-04-02T17:59:59.000Z', '2018-04-01T18:00:00.000Z', true)).toBe(0);
  });

  it('follows the week of a two-week calendar', () => {
    expect(workHoursCount(JULES(), ...WEEK, true)).toBe(30);
    expect(workHoursCount(JULES(), '2018-04-15T22:00:00.000Z', '2018-04-20T21:59:59.000Z', true)).toBe(30);
    expect(workHoursCount(JULES(), '2018-04-08T22:00:00.000Z', '2018-04-13T21:59:59.000Z', true)).toBe(16);
    expect(
      workHoursCount(JULES([leave('jules', '2018-04-11T02:00:00.000Z', '2018-04-13T02:00:00.000Z')]), '2018-04-08T22:00:00.000Z', '2018-04-13T21:59:59.000Z', true),
    ).toBe(16);
    expect(
      workHoursCount(JULES([leave('jules', '2018-04-08T22:00:00.000Z', '2018-04-09T21:59:00.000Z')]), '2018-04-08T22:00:00.000Z', '2018-04-13T21:59:59.000Z', true),
    ).toBe(8);
  });

  it('counts part days at both ends', () => {
    const standard = calendar('std35', 'UTC', STANDARD_LINES('std35').map((line) => (line.dayPeriod === 'AFTERNOON' ? { ...line, hourTo: 16 } : line)));

    expect(workHoursCount(standard, '2017-05-03T14:03:00.000Z', '2017-05-04T11:03:00.000Z', false)).toBeCloseTo(5, 9);
  });

  it('merges a whole-day line with a shorter line of the same day', () => {
    const jean = JEAN();
    const withFullDay = { ...jean, attendances: [...jean.attendances, { ...jean.attendances[2], id: 'full', hourFrom: 0, hourTo: 24 }] };

    expect(workHoursCount(withFullDay, '2018-06-19T21:00:00.000Z', '2018-06-20T23:00:00.000Z', true)).toBeCloseTo(24, 5);
  });

  it('counts across zones as absolute time', () => {
    expect(workHoursCount(JEAN(), '2018-04-10T08:00:00.000Z', '2018-04-10T12:00:00.000Z', true)).toBe(4);
    expect(workHoursCount(JEAN(), '2018-04-10T14:00:00.000Z', '2018-04-10T18:00:00.000Z', true)).toBe(0);
    expect(workHoursCount(JEAN(), '2018-04-10T06:00:00.000Z', '2018-04-10T02:00:00.000Z', true)).toBe(0);
    expect(workHoursCount(JEAN(), '2018-04-10T06:00:00.000Z', '2018-04-10T22:00:00.000Z', true)).toBe(8);
  });
});
