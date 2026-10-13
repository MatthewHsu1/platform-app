import { trimIndexViews } from 'src/shared/install/trim-index-views';
import { stepDeadline } from 'src/stock/scheduler/utils/step-deadline.util';

// Hiding one list column takes about a second, so the trim stops after this and the next day
// goes on until every list is done.
const TRIM_BUDGET_MS = 240_000;

export const trimListColumns = async ({ startedAt }: { startedAt: number }) => {
  await trimIndexViews(stepDeadline({ now: Date.now(), jobStartedAt: startedAt, budgetMs: TRIM_BUDGET_MS }));
};
