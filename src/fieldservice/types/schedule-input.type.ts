// The schedule fields the trigger reads: the stored window of a service job.
export type ScheduleInput = {
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledDurationHours: number;
};
