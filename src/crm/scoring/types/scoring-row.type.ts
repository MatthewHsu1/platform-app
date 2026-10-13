export type ScoringRow = {
  id: string;
  variable: string;
  value: string;
  wonCount: number;
  lostCount: number;
  teamId: string | null;
  createdAt: string;
};
