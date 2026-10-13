export type CaseStageRow = {
  id: string;
  name: string | null;
  sequence: number;
  active: boolean;
  unattended: boolean;
  closed: boolean;
  fold: boolean;
  createdAt: string;
  teamIds: string[];
};
