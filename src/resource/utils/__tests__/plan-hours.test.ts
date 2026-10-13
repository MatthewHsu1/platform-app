import { describe, expect, it } from 'vitest';

import { planHours } from 'src/resource/utils/plan-hours.util';
import { JEAN, JOHN, calendar, leave } from 'src/resource/utils/__tests__/calendar-fixtures';

const JEAN_WITH_LEAVE = JEAN([leave('jean', '2018-04-10T22:00:00.000Z', '2018-04-11T21:59:59.000Z')]);
// Tuesday 10 April 00:00 in Brussels.
const TUESDAY_MIDNIGHT = '2018-04-09T22:00:00.000Z';

describe('planHours', () => {
  it('walks forward through the working hours', () => {
    expect(planHours(JEAN_WITH_LEAVE, 2, TUESDAY_MIDNIGHT, false)).toBe('2018-04-10T08:00:00.000Z');
    expect(planHours(JEAN_WITH_LEAVE, 20, TUESDAY_MIDNIGHT, false)).toBe('2018-04-12T10:00:00.000Z');
    expect(planHours(JEAN_WITH_LEAVE, 5, '2018-04-10T13:00:00.000Z', true)).toBe('2018-04-12T10:00:00.000Z');
  });

  it('walks back for negative hours', () => {
    expect(planHours(JEAN_WITH_LEAVE, -10, TUESDAY_MIDNIGHT, true)).toBe('2018-04-06T12:00:00.000Z');
  });

  it('lands zero hours on the start of the next working time', () => {
    expect(planHours(JEAN_WITH_LEAVE, 0, '2018-04-10T22:00:00.000Z', true)).toBe('2018-04-12T06:00:00.000Z');
    expect(planHours(JEAN_WITH_LEAVE, 0, TUESDAY_MIDNIGHT, false)).toBe('2018-04-10T06:00:00.000Z');
  });

  it('keeps a fraction of a second', () => {
    expect(planHours(JEAN_WITH_LEAVE, 0.0002, TUESDAY_MIDNIGHT, true)).toBe('2018-04-10T06:00:00.720Z');
  });

  it('plans far ahead', () => {
    expect(planHours(JEAN_WITH_LEAVE, 3000, TUESDAY_MIDNIGHT, false)).toBe('2019-09-16T14:00:00.000Z');
  });

  it('plans from an instant given in another zone', () => {
    expect(planHours(JEAN(), 10, '2018-04-10T08:00:00.000Z', false)).toBe('2018-04-11T10:00:00.000Z');
    expect(planHours(JEAN(), 10, '2018-04-10T18:00:00.000Z', false)).toBe('2018-04-12T08:00:00.000Z');
  });

  it('crosses a daylight-saving change', () => {
    expect(planHours(JOHN(), 3, '2018-03-10T06:00:00.000Z', true)).toBe('2018-03-13T17:00:00.000Z');
  });

  it('finds no date when the calendar has no working time', () => {
    expect(planHours(calendar('empty', 'UTC', []), 4, TUESDAY_MIDNIGHT, true)).toBeNull();
  });
});
