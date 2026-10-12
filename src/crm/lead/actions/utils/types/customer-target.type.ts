export type CustomerTarget = { kind: 'keep' } | { kind: 'person'; personId: string } | { kind: 'create' } | { kind: 'none' };
