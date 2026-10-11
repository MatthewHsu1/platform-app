import { CLAIM_HELD_MESSAGE, claimKey, findClaims, isStaleClaim, releaseClaims, takeClaims } from 'src/shared/claims/claim';
import { randomId } from 'src/shared/utils/random-id.util';
import { resumeAllocation } from 'src/stock/reports/reception/apply-allocation';
import { StockUserError } from 'src/stock/stock-errors';

type HoldClaims = {
  findClaims: typeof findClaims;
  isStaleClaim: typeof isStaleClaim;
  takeClaims: typeof takeClaims;
  releaseClaims: typeof releaseClaims;
};

const ALLOCATE_ACTION = 'allocate';

const distinct = (ids: string[]) => [...new Set(ids)];

// An allocation splits moves, moves reserved lines and links moves across
// several writes. Flows that reserve, unreserve or validate the same transfers
// wait while one holds them, and an allocation waits while they run.
export const makeAllocationHolds = ({
  claims,
  resumeAllocation: resume,
  newRunId,
}: {
  claims: HoldClaims;
  resumeAllocation: (recordId: string) => Promise<void>;
  newRunId: () => string;
}) => {
  const keysOf = (pickingIds: string[]) => distinct(pickingIds).sort().map((pickingId) => claimKey(ALLOCATE_ACTION, pickingId));

  // A stopped allocation on these transfers is finished from its stored plan
  // (or freed when it stored none) before anything else touches them.
  const settleAllocations = async (pickingIds: string[]) => {
    const stale = (await claims.findClaims(keysOf(pickingIds))).filter((row) => claims.isStaleClaim(row));

    for (const row of stale) {
      await resume(row.key.slice(ALLOCATE_ACTION.length + 1));
    }
  };

  // Runs `run` holding the allocation claim of every transfer; "try again"
  // while an allocation holds one of them. The claims store no plan, so one
  // left by a stopped run is just freed.
  const holdTransfers = async <TResult>(pickingIds: string[], run: () => Promise<TResult>): Promise<TResult> => {
    const keys = keysOf(pickingIds);

    await settleAllocations(pickingIds);
    const runId = newRunId();
    const claimed = await claims.takeClaims(keys, runId, { steps: {} });

    if (claimed.held.length > 0 || claimed.stale.length > 0) {
      await claims.releaseClaims(claimed.taken, runId);
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    try {
      return await run();
    } finally {
      await claims.releaseClaims(keys, runId).catch(() => undefined);
    }
  };

  return { settleAllocations, holdTransfers };
};

export const { settleAllocations, holdTransfers } = makeAllocationHolds({
  claims: { findClaims, isStaleClaim, takeClaims, releaseClaims },
  resumeAllocation,
  newRunId: randomId,
});
