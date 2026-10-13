export type CalendarRow = {
  id: string;
  name: string | null;
  tz: string;
  hoursPerDay: number;
  twoWeeksCalendar: boolean;
  active: boolean;
};
