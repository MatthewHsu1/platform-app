// `unconfirmed`: the order was written, but what it made could not be read back.
export type ReplenishOutcome = { kind: 'ordered'; pickingName: string | null } | { kind: 'unconfirmed' };
