import { type RelocateLotOutcome } from 'src/stock/lot/types/relocate-lot-outcome.type';

// `stale`: a stopped run holds the lot; the batch leaves it for a run that finishes that one first.
export type LotBatchOutcome = RelocateLotOutcome | { kind: 'stale' };
