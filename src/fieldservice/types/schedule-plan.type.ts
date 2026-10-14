// Only the fields the trigger must write; an empty object means no write.
export type SchedulePlan = Partial<{
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledDurationHours: number;
}>;
