export type DoneLineCorrectionPlan = {
  deltas: { key: string; delta: number; inDateFromKey: string | null }[];
  freeKey: string | null;
};
