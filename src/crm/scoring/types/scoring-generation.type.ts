// The scoring rows the score reads: created at or after `since`, and before
// `before` while a rebuild writes the next set. Null bounds are open.
export type ScoringGeneration = { since: string | null; before: string | null };
