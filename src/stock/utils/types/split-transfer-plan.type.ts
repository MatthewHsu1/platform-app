export type SplitTransferPlan =
  | { kind: 'refuse'; reason: string; values: { name: string } }
  | { kind: 'split'; splitMoveIds: string[]; zeroMoveIds: string[] };
