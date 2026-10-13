import { describe, expect, it } from 'vitest';

import { attendanceIntervals, leaveIntervals, workIntervals } from 'src/resource/utils/work-intervals.util';
import { JEAN, JULES, STANDARD_LINES, at, calendar, leave } from 'src/resource/utils/__tests__/calendar-fixtures';

const iso = (intervals: { start: number; stop: number }[]) =>
  intervals.map((item) => [new Date(item.start).toISOString(), new Date(item.stop).toISOString()]);

describe('attendance and leave intervals', () => {
  it('builds each working day in the calendar zone and clips the last one to the request', () => {
    const losAngeles = { ...JEAN(), calendar: { ...JEAN().calendar, tz: 'America/Los_Angeles' } };
    const result = iso(attendanceIntervals(losAngeles, at('2023-01-01T00:00:00.000Z'), at('2023-01-31T23:59:59.999Z')));

    expect(result[result.length - 1]).toEqual(['2023-01-31T16:00:00.000Z', '2023-01-31T23:59:59.999Z']);
  });

  it('leaves the lunch break out', () => {
    const standard = calendar('std', 'UTC', STANDARD_LINES('std'));

    expect(iso(attendanceIntervals(standard, at('2017-05-03T00:00:00.000Z'), at('2017-05-04T00:00:00.000Z')))).toEqual([
      ['2017-05-03T08:00:00.000Z', '2017-05-03T12:00:00.000Z'],
      ['2017-05-03T13:00:00.000Z', '2017-05-03T17:00:00.000Z'],
    ]);
  });

  it('takes the lines of the week the day falls in, in a two-week calendar', () => {
    const monday = attendanceIntervals(JULES(), at('2018-04-09T00:00:00.000Z'), at('2018-04-10T00:00:00.000Z'));
    const wednesday = attendanceIntervals(JULES(), at('2018-04-04T00:00:00.000Z'), at('2018-04-05T00:00:00.000Z'));

    expect(iso(monday)).toEqual([['2018-04-09T06:00:00.000Z', '2018-04-09T14:00:00.000Z']]);
    expect(iso(wednesday)).toEqual([['2018-04-04T05:00:00.000Z', '2018-04-04T13:00:00.000Z']]);
  });

  it('counts only time off of this calendar or of no calendar, and only of kind time off', () => {
    const data = JEAN([
      leave('jean', '2018-04-10T22:00:00.000Z', '2018-04-11T21:59:59.000Z'),
      leave(null, '2018-04-12T06:00:00.000Z', '2018-04-12T08:00:00.000Z'),
      leave('other', '2018-04-13T06:00:00.000Z', '2018-04-13T14:00:00.000Z'),
      leave('jean', '2018-04-13T06:00:00.000Z', '2018-04-13T14:00:00.000Z', 'OTHER'),
    ]);

    expect(iso(leaveIntervals(data, at('2018-04-09T00:00:00.000Z'), at('2018-04-14T00:00:00.000Z')))).toEqual([
      ['2018-04-10T22:00:00.000Z', '2018-04-11T21:59:59.000Z'],
      ['2018-04-12T06:00:00.000Z', '2018-04-12T08:00:00.000Z'],
    ]);
    expect(iso(workIntervals(data, at('2018-04-11T00:00:00.000Z'), at('2018-04-13T00:00:00.000Z'), true))).toEqual([
      ['2018-04-12T08:00:00.000Z', '2018-04-12T14:00:00.000Z'],
    ]);
  });
});
