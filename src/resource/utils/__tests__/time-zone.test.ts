import { describe, expect, it } from 'vitest';

import { isKnownTimeZone, localToUtc, utcToLocal } from 'src/resource/utils/time-zone.util';

const wall = (year: number, month: number, day: number, hour: number, minute = 0, second = 0, millisecond = 0) => ({
  year,
  month,
  day,
  hour,
  minute,
  second,
  millisecond,
});

describe('time zones', () => {
  it('turns a wall time into an instant with the offset of that day', () => {
    expect(new Date(localToUtc(wall(2018, 4, 10, 10), 'Europe/Brussels')).toISOString()).toBe('2018-04-10T08:00:00.000Z');
    expect(new Date(localToUtc(wall(2018, 1, 10, 10), 'Europe/Brussels')).toISOString()).toBe('2018-01-10T09:00:00.000Z');
    expect(new Date(localToUtc(wall(2018, 4, 10, 8), 'Etc/GMT+10')).toISOString()).toBe('2018-04-10T18:00:00.000Z');
  });

  it('uses the winter offset for a wall time that is skipped or repeated by a clock change', () => {
    expect(new Date(localToUtc(wall(2018, 3, 25, 2, 30), 'Europe/Brussels')).toISOString()).toBe('2018-03-25T01:30:00.000Z');
    expect(new Date(localToUtc(wall(2018, 10, 28, 2, 30), 'Europe/Brussels')).toISOString()).toBe('2018-10-28T01:30:00.000Z');
  });

  it('reads the wall time and weekday of an instant', () => {
    expect(utcToLocal(Date.parse('2018-04-10T22:30:00.500Z'), 'Europe/Brussels')).toEqual({
      year: 2018,
      month: 4,
      day: 11,
      hour: 0,
      minute: 30,
      second: 0,
      millisecond: 500,
      weekday: 2,
    });
  });

  it('knows real zone names', () => {
    expect(isKnownTimeZone('Europe/Brussels')).toBe(true);
    expect(isKnownTimeZone('Etc/GMT-6')).toBe(true);
    expect(isKnownTimeZone('Mars/Olympus')).toBe(false);
    expect(isKnownTimeZone('')).toBe(false);
  });
});
