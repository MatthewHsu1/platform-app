// What a button does with a record: refuse with a reason, or write these values.
export type OrderActionPlan = { kind: 'refuse'; reason: string } | { kind: 'write'; data: Record<string, unknown> };
