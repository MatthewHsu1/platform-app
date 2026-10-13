import { claimKey, type makeClaims, openJournal, withClaim } from 'src/shared/claims/claim';
import { planLotRelocations } from 'src/stock/lot/plan-lot-relocations';
import { recomputeLot } from 'src/stock/lot/recompute-lot';
import { LOT_PLAN_STEP, resumeRelocateLotBatch } from 'src/stock/lot/relocate-lot-batch';
import { moveQuants } from 'src/stock/quant/actions/relocate-quants';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { LOT_RELOCATED_REASON } from 'src/stock/utils/plan-lot-location.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type LotBatchPointer } from 'src/stock/lot/types/lot-batch-pointer.type';
import { type LotRelocationRequest } from 'src/stock/lot/types/lot-relocation-request.type';
import { type RelocateLotOutcome } from 'src/stock/lot/types/relocate-lot-outcome.type';
import { type RecomputeLotOptions } from 'src/stock/lot/types/recompute-lot-options.type';
import { type RelocateLotPlan } from 'src/stock/lot/types/relocate-lot-plan.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

type RelocateRequest = { toLocationId: string | null };
type StoredLotPlan = RelocateLotPlan | LotBatchPointer;
type RunOutcome = Exclude<RelocateLotOutcome, { kind: 'held' }>;

type RelocateLotStore = Pick<ReturnType<typeof makeClaims>, 'withClaim' | 'openJournal'> & {
  planLotRelocations: (requests: LotRelocationRequest[]) => Promise<Map<string, RelocateLotPlan>>;
  readQuants: (ids: string[]) => Promise<QuantRow[]>;
  moveQuants: (quants: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => Promise<unknown>;
  recomputeLot: (lotIds: string[], options?: RecomputeLotOptions) => Promise<void>;
  // 'held' while another run is finishing that batch.
  resumeBatch: (batchId: string) => Promise<'done' | 'held'>;
};

const DONE: RunOutcome = { kind: 'done' };
const NOTHING: RelocateLotPlan = { kind: 'nothing' };

// Thrown inside the lot's claim, so the claim stays (it is past the commit point) while another run finishes the
// batch; the caller answers that the lot is held.
class BatchStillRunning extends Error {}

export const makeRelocateLot = (store: RelocateLotStore) => {
  const planRelocation = async (lotId: string, request: RelocateRequest): Promise<RelocateLotPlan> =>
    (await store.planLotRelocations([{ lotId, toLocationId: request.toLocationId }])).get(lotId) ?? NOTHING;

  // The lot's claim says a batch moves it: that batch is finished (or freed) first, then the lot shows where its
  // stock is, or keeps a location typed on it when it holds none. While another run finishes the batch, the claim
  // stays for a later resume.
  const finishBatch = async (lotId: string, pointer: LotBatchPointer) => {
    if ((await store.resumeBatch(pointer.batchId)) === 'held') {
      throw new BatchStillRunning(`The batch that moves lot ${lotId} is still running.`);
    }
    await store.recomputeLot([lotId], { keepWhenEmpty: true });
    return DONE;
  };

  // A run that stopped before its commit point wrote nothing; its claim is freed. The lot's location already shows
  // the edit, so a planned move that never happened leaves it showing where the stock still is.
  const freeUncommitted = async (lotId: string, journal: ClaimJournal) => {
    const stored = await journal.step<StoredLotPlan>(LOT_PLAN_STEP, async () => NOTHING, async () => {});

    if (stored.kind === 'move') {
      await store.recomputeLot([lotId]);
    }
    return stored.kind === 'batch' ? finishBatch(lotId, stored) : DONE;
  };

  // `request` null: a resume, which finishes only a run that passed its commit point. A refusal is decided before
  // the commit point, so the claim is released at once.
  const runRelocateLot = async (lotId: string, request: RelocateRequest | null, journal: ClaimJournal): Promise<RunOutcome> => {
    if (request === null && !journal.committed) {
      return freeUncommitted(lotId, journal);
    }
    const plan = await journal.step<StoredLotPlan>(
      LOT_PLAN_STEP,
      async () => (request === null ? NOTHING : planRelocation(lotId, request)),
      async () => {},
    );

    if (plan.kind === 'batch') {
      return finishBatch(lotId, plan);
    }
    if (plan.kind === 'refuse') {
      return { kind: 'refused', reason: plan.reason, values: plan.values };
    }
    if (plan.kind === 'nothing') {
      return DONE;
    }
    await journal.commit();
    // A resumed run replays the moves its stored plan chose; the rows read here only matter to a first run.
    await store.moveQuants(await store.readQuants(plan.quantIds), plan.toLocationId, LOT_RELOCATED_REASON, {
      unpack: plan.unpack,
      journal,
      stepPrefix: 'relocateLot:move',
    });
    await store.recomputeLot([lotId]);

    return DONE;
  };

  const runOnce = (lotId: string, request: RelocateRequest | null) => {
    const key = claimKey('relocateLot', lotId);

    return store.withClaim(key, async (runId) => {
      const journal = await store.openJournal(key, runId);

      // The claim was a stopped run's: that run is finished (or freed) first, and this request runs next.
      if (journal.resumed) {
        await runRelocateLot(lotId, null, journal);
        return { replayed: true, outcome: DONE };
      }
      return { replayed: false, outcome: request === null ? DONE : await runRelocateLot(lotId, request, journal) };
    });
  };

  // Another run is finishing the batch that holds the lot.
  const heldByBatch = async <TResult>(run: () => Promise<TResult>, held: TResult) => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof BatchStillRunning) {
        return held;
      }
      throw error;
    }
  };

  const relocateLot = async (lotId: string, toLocationId: string | null): Promise<RelocateLotOutcome> => {
    for (;;) {
      const claimed = await heldByBatch(() => runOnce(lotId, { toLocationId }), { kind: 'held' } as const);

      if (claimed.kind === 'held') {
        return { kind: 'held' };
      }
      if (!claimed.result.replayed) {
        return claimed.result.outcome;
      }
    }
  };

  // A lot whose batch another run is finishing keeps its claim for a later resume.
  const resumeRelocateLot = async (lotId: string) => {
    await heldByBatch(() => runOnce(lotId, null), null);
  };

  return { relocateLot, resumeRelocateLot };
};

export const { relocateLot, resumeRelocateLot } = makeRelocateLot({
  withClaim,
  openJournal,
  planLotRelocations,
  readQuants: (ids) => stockQuants.find<QuantRow>({ id: { in: ids } }, QUANT_ROW),
  moveQuants,
  recomputeLot,
  resumeBatch: resumeRelocateLotBatch,
});
