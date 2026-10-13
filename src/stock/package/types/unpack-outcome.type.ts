export type UnpackOutcome = { kind: 'done' } | { kind: 'refused'; reason: string } | { kind: 'held' };
