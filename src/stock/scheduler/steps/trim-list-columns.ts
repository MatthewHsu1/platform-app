import { trimIndexViews } from 'src/shared/install/trim-index-views';

// Hiding one list column takes about a second and the job shares its 900 s with the other steps,
// so the trim stops after this and the next day goes on until every list is done.
const TRIM_BUDGET_MS = 240_000;

export const trimListColumns = async () => {
  await trimIndexViews(Date.now() + TRIM_BUDGET_MS);
};
