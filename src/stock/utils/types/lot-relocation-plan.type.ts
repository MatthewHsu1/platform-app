export type LotRelocationPlan =
  | { kind: 'nothing' }
  | { kind: 'refuse'; reason: string }
  | { kind: 'move'; quantIds: string[]; unpack: boolean };
