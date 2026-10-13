export type OpenLineEditPlan =
  | { kind: 'none' }
  | { kind: 'putBack'; data: Record<string, unknown>; reason: string }
  | { kind: 'sync'; data: Record<string, unknown>; recomputeKeys: string[]; recomputeMoveIds: string[] };
