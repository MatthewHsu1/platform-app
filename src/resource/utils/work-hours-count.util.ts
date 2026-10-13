import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { workIntervals } from 'src/resource/utils/work-intervals.util';

const HOUR = 3_600_000;

// The working hours between two instants; an end before the start gives 0.
export const workHoursCount = (data: CalendarData, start: string, end: string, computeLeaves: boolean) =>
  workIntervals(data, Date.parse(start), Date.parse(end), computeLeaves).reduce(
    (sum, interval) => sum + (interval.stop - interval.start) / HOUR,
    0,
  );
