// A move of the chain before a delivery, with the moves that feed it.
export type ChainMove = { id: string; state: string; pickingId: string | null; moveOrigIds: string[] };
