export type ScrapDefaultsPlan = { kind: 'write'; data: Record<string, unknown> } | { kind: 'refuse'; reason: string };
