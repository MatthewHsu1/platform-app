export type SlaRow = {
  id: string;
  ticketId: string;
  slaId: string;
  name: string | null;
  deadline: string | null;
  hours: number;
  expectedStageId: string | null;
  consumedTime: number;
  lastStateDate: string | null;
  state: string;
};
