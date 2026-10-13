// A move that exists already, or one of the plan's own moves by its key.
export type MoveRef = { kind: 'existing'; id: string } | { kind: 'planned'; key: string };
