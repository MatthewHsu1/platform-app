import { type AttendanceRow } from 'src/resource/types/attendance-row.type';
import { hasAttendanceOverlap } from 'src/resource/utils/attendance-overlap.util';

type StoredLine = Pick<AttendanceRow, 'id' | 'dayofweek' | 'hourFrom' | 'hourTo' | 'weekType'>;

// Which of the working times staff saved in one batch to undo: a line is undone when adding it, after the
// lines that were not saved now and the earlier saves that stay, makes working times overlap. An overlap that
// was there before the line is not blamed on it.
export const planAttendanceUndo = ({
  twoWeeksCalendar,
  stored,
  savedLineIds,
}: {
  twoWeeksCalendar: boolean;
  stored: StoredLine[];
  savedLineIds: string[];
}) => {
  const saved = new Set(savedLineIds);
  let working = stored.filter((line) => !saved.has(line.id));
  const undo: string[] = [];

  for (const lineId of [...saved]) {
    const line = stored.find((candidate) => candidate.id === lineId);

    if (line === undefined) {
      continue;
    }
    const candidate = [...working, line];

    if (hasAttendanceOverlap(twoWeeksCalendar, candidate) && !hasAttendanceOverlap(twoWeeksCalendar, working)) {
      undo.push(lineId);
    } else {
      working = candidate;
    }
  }

  return undo;
};
