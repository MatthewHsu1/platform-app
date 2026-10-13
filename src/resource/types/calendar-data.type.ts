import { type AttendanceRow } from 'src/resource/types/attendance-row.type';
import { type CalendarRow } from 'src/resource/types/calendar-row.type';
import { type LeaveRow } from 'src/resource/types/leave-row.type';

// A working-hours record with its working times and the time off that counts for it.
export type CalendarData = { calendar: CalendarRow; attendances: AttendanceRow[]; leaves: LeaveRow[] };
