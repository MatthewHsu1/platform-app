import { claimKey, openJournal, withClaim } from 'src/shared/claims/claim';
import { reconcileWarehouse } from 'src/stock/warehouse/reconcile-warehouse';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';

type RunClaimed = <TResult>(
  key: string,
  run: (runId: string) => Promise<TResult>,
) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;

type ReconcileRequest = { event: WarehouseEvent; change: WarehouseChange };

type RunResult = { replayed: boolean; error: Error | null };

const ATTEMPTS = 10;
const WAIT_MS = 3_000;
const REQUEST_STEP = 'reconcile:request';

// The request is stored on the claim before the reconciler's first write, so a stopped run is finished
// with its own event and change. The reconciler's error comes back as a value, so the claim is released
// before it is thrown: a failed rebuild must not lock the warehouse for 15 minutes.
export const makeReconcileWarehouseClaimed = ({
  runClaimed,
  openJournal: open,
  reconcile,
  wait,
}: {
  runClaimed: RunClaimed;
  openJournal: (key: string, runId: string) => Promise<ClaimJournal>;
  reconcile: (warehouseId: string, event: WarehouseEvent, change?: WarehouseChange) => Promise<void>;
  wait: (ms: number) => Promise<void>;
}) => {
  // `request` null: a resume. A claim with no stored request wrote nothing; the run ends and the claim is freed.
  const runOnce = (warehouseId: string, request: ReconcileRequest | null) => {
    const key = claimKey('reconcile', warehouseId);

    return runClaimed(key, async (runId): Promise<RunResult> => {
      const journal = await open(key, runId);
      const replayed = journal.resumed;

      if (!replayed && request === null) {
        return { replayed, error: null };
      }
      try {
        await journal.step<ReconcileRequest>(
          REQUEST_STEP,
          async () => {
            const { event, change } = request as ReconcileRequest;
            return { event, change: { ...change, requestId: runId } };
          },
          (stored) => reconcile(warehouseId, stored.event, stored.change),
        );
        return { replayed, error: null };
      } catch (error) {
        return { replayed, error: error instanceof Error ? error : new Error(String(error)) };
      }
    });
  };

  const reconcileWarehouseClaimed = async (warehouseId: string, event: WarehouseEvent, change: WarehouseChange = {}) => {
    for (let attempt = 1; ; attempt += 1) {
      const outcome = await runOnce(warehouseId, { event, change });

      if (outcome.kind === 'done') {
        if (outcome.result.error !== null) {
          throw outcome.result.error;
        }
        // The claim was a stopped run's: that run is finished, this request runs next.
        if (outcome.result.replayed) {
          continue;
        }
        return;
      }
      if (attempt >= ATTEMPTS) {
        throw new Error(`Another run is still updating warehouse ${warehouseId}; its flows were not rebuilt.`);
      }
      await wait(WAIT_MS);
    }
  };

  const resumeReconcile = async (warehouseId: string) => {
    const outcome = await runOnce(warehouseId, null);

    if (outcome.kind === 'done' && outcome.result.error !== null) {
      throw outcome.result.error;
    }
  };

  return { reconcileWarehouseClaimed, resumeReconcile };
};

export const { reconcileWarehouseClaimed, resumeReconcile } = makeReconcileWarehouseClaimed({
  runClaimed: withClaim,
  openJournal,
  reconcile: reconcileWarehouse,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
