import { type ClaimKey } from 'src/shared/claims/types/claim-key.type';

// `committed`: the run passed its commit point (its first write); from then on a failed run keeps the claim for resume.
// `owner`: on a claim a run took beside its own, the key whose journal holds that run.
export type ClaimProgress = { steps: Record<string, { plan?: unknown; done: boolean }>; committed?: boolean; owner?: ClaimKey };
