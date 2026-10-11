export type CountQuantCreatePlan =
  | { kind: 'refuse'; reason: string; values: Record<string, string> }
  | { kind: 'merge'; targetId: string; data: Record<string, unknown>; destroyId: string }
  | { kind: 'keep'; data: Record<string, unknown> };
