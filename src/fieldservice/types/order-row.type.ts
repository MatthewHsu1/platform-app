export type OrderRow = {
  id: string;
  stageClosedStatus: string | null;
  workerId: string | null;
  teamId: string | null;
  locationId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledDurationHours: number;
  closed: boolean;
};
