export type LotNamePlan =
  | { kind: 'keep' }
  | { kind: 'number'; sequenceId: string }
  | { kind: 'refuse'; reason: string };
