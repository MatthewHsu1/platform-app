export type AttendanceRow = {
  id: string;
  calendarId: string;
  name: string | null;
  dayofweek: string;
  hourFrom: number;
  hourTo: number;
  dayPeriod: string;
  weekType: string | null;
  sequence: number;
};
