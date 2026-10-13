export type LeadUpdatePlan =
  | { kind: 'refuse'; reason: string }
  | { kind: 'update'; data: Record<string, string | number | boolean | null> };
