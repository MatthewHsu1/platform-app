// An order may enter its stage, or the first field its stage's rules need is still empty.
export type StageRequirementPlan = { kind: 'ok' } | { kind: 'missing'; stageName: string; fieldLabel: string };
