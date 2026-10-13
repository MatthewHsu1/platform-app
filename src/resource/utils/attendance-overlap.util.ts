import { DAY_OF_WEEK_INDEX, WEEK_TYPE } from 'src/resource/resource-options.constant';
import { type AttendanceRow } from 'src/resource/types/attendance-row.type';

type Line = Pick<AttendanceRow, 'id' | 'dayofweek' | 'hourFrom' | 'hourTo' | 'weekType'>;

// Lines of one week laid end to end over the week's hours; a millionth of an hour keeps lines that only
// touch from counting as overlapping. A line that does not end after it starts also fails the check.
const overlaps = (lines: Line[]) => {
  const spans = lines
    .map((line) => ({
      start: (DAY_OF_WEEK_INDEX[line.dayofweek] ?? 0) * 24 + line.hourFrom + 0.000001,
      stop: (DAY_OF_WEEK_INDEX[line.dayofweek] ?? 0) * 24 + line.hourTo,
    }))
    .sort((left, right) => left.start - right.start);

  if (spans.some((span) => span.start >= span.stop)) {
    return true;
  }
  let latestStop = Number.NEGATIVE_INFINITY;

  for (const span of spans) {
    if (span.start <= latestStop) {
      return true;
    }
    latestStop = Math.max(latestStop, span.stop);
  }

  return false;
};

export const hasAttendanceOverlap = (twoWeeksCalendar: boolean, attendances: Line[]) =>
  twoWeeksCalendar
    ? overlaps(attendances.filter((line) => line.weekType === WEEK_TYPE.FIRST)) ||
      overlaps(attendances.filter((line) => line.weekType === WEEK_TYPE.SECOND))
    : overlaps(attendances);
