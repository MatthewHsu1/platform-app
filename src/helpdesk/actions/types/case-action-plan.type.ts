export type CaseActionPlan = { kind: 'write'; data: Record<string, unknown> } | { kind: 'refuse'; reason: string };
