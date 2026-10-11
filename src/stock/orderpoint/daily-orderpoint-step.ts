import { claimKey, withClaim } from 'src/shared/claims/claim';
import { destroyProcessedSuggestions } from 'src/stock/orderpoint/destroy-processed-suggestions';
import {
  releaseOrderpointClaims,
  releaseOrderpointClaimsUnlessWritten,
  takeOrderpointClaims,
} from 'src/stock/orderpoint/orderpoint-claims';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { procureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { addRefreshRefusalTask, refreshReplenishmentSuggestions } from 'src/stock/orderpoint/refresh-replenishment-suggestions';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { ORDERPOINT_TRIGGER, REPLENISHMENT_REFRESH_IN_DAILY_JOB } from 'src/stock/stock-options.constant';
import { productProducts } from 'src/stock/stock-records';

const REFRESH_BUDGET_MS = 10 * 60 * 1000;

// Active rules of active variants. Archiving a variant archives its rules, so
// the archived variants are the short list to read.
const readActiveRules = async () => {
  const [rules, archivedProducts] = await Promise.all([
    stockWarehouseOrderpoints.find<{ id: string; productId: string | null; trigger: 'AUTO' | 'MANUAL' }>(
      { active: { eq: true } },
      'id productId trigger',
    ),
    productProducts.find<{ id: string }>({ active: { eq: false } }, 'id'),
  ]);
  const archived = new Set(archivedProducts.map((product) => product.id));

  return rules.filter((rule) => rule.productId !== null && !archived.has(rule.productId));
};

// Clears the processed suggestions, brings the stored values of every active
// rule up to date (manual ones too, as the list shows them), and orders for
// the automatic ones. Those are claimed before the recompute, so an Order
// click in between cannot leave this run ordering a quantity already ordered.
// A rule in a supply loop gets a task and is not ordered.
export const dailyOrderpointStep = async () => {
  const claimed = await withClaim(claimKey('scheduler', 'orderpoints'), async (runId) => {
    await destroyProcessedSuggestions();
    const rules = await readActiveRules();
    const automaticIds = rules.filter((rule) => rule.trigger === ORDERPOINT_TRIGGER.AUTO).map((rule) => rule.id);
    let taken: string[] = [];

    try {
      ({ taken } = await takeOrderpointClaims(automaticIds, runId));
      const { failures } = await recomputeOrderpoint(rules.map((rule) => rule.id));
      const failed = new Set(failures.map((failure) => failure.orderpointId));

      await addReplenishmentIssueTasks(failures);
      await procureOrderpoints(
        taken.filter((id) => !failed.has(id)),
        { raiseUserError: false, runId },
      );
    } catch (error) {
      // A take that failed partway has claims of this run it never returned; the run id frees only this run's.
      await releaseOrderpointClaimsUnlessWritten(automaticIds, runId);
      throw error;
    }
    // The order is placed: a failed release only holds the rules until the stale-claim resume frees them.
    await releaseOrderpointClaims(taken, runId).catch(() => undefined);

    if (REPLENISHMENT_REFRESH_IN_DAILY_JOB) {
      const refreshed = await refreshReplenishmentSuggestions({ deadlineAt: Date.now() + REFRESH_BUDGET_MS });

      if (refreshed.kind === 'refused') {
        await addRefreshRefusalTask(refreshed);
      }
    }
  });

  // Only a second daily run reaches this; the job reports it with its other failures.
  if (claimed.kind === 'held') {
    throw new Error('Reordering rules are already being ordered by another run.');
  }
};
