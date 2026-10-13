export type StageRow = {
  id: string;
  name: string;
  sequence: number;
  isWon: boolean;
  fold: boolean;
  rottingThresholdDays: number;
  createdAt: string;
  teamIds: string[];
};
