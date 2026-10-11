const FIRST_WAIT_MS = 10;
const MAX_WAIT_MS = 1000;

// The wait before retry `attempt + 1` of a compare-and-set loop. It doubles
// per clash, with jitter, so a writer that keeps losing is not starved by a
// fixed short window.
export const backoffMs = (attempt: number) =>
  Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (attempt - 1)) * (0.5 + Math.random() / 2);
