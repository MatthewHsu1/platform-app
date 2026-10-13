export type SplitMoveCreate = {
  id: string;
  values: Record<string, unknown>;
  moveOrigIds: string[];
  moveDestIds: string[];
  referenceIds: string[];
};
