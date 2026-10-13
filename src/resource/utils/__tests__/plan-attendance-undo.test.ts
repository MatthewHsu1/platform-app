import { describe, expect, it } from 'vitest';

import { planAttendanceUndo } from 'src/resource/utils/plan-attendance-undo.util';

const line = (id: string, hourFrom: number, hourTo: number, dayofweek = 'MONDAY') => ({ id, dayofweek, hourFrom, hourTo, weekType: null });

describe('planAttendanceUndo', () => {
  it('undoes a saved working time that overlaps one already there', () => {
    expect(planAttendanceUndo({ twoWeeksCalendar: false, stored: [line('a', 8, 12), line('b', 11, 14)], savedLineIds: ['b'] })).toEqual(['b']);
  });

  it('keeps a saved working time that only touches the others', () => {
    expect(planAttendanceUndo({ twoWeeksCalendar: false, stored: [line('a', 8, 12), line('b', 12, 14)], savedLineIds: ['b'] })).toEqual([]);
  });

  it('keeps the first of two saved lines that overlap each other and undoes the second', () => {
    expect(
      planAttendanceUndo({ twoWeeksCalendar: false, stored: [line('a', 8, 12), line('b', 13, 16), line('c', 15, 17)], savedLineIds: ['b', 'c'] }),
    ).toEqual(['c']);
  });

  it('does not blame a saved working time for an overlap it is not part of', () => {
    expect(
      planAttendanceUndo({ twoWeeksCalendar: false, stored: [line('a', 8, 12), line('b', 11, 14), line('c', 8, 9, 'TUESDAY')], savedLineIds: ['c'] }),
    ).toEqual([]);
  });
});
