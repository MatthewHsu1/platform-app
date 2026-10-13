import { claimKey, findClaims, type makeClaims, openJournal, releaseClaims, takeClaims, withClaim } from 'src/shared/claims/claim';
import { groupBy } from 'src/shared/utils/group-by.util';
import { planLotRelocations } from 'src/stock/lot/plan-lot-relocations';
import { recomputeLot } from 'src/stock/lot/recompute-lot';
import { moveQuants } from 'src/stock/quant/actions/relocate-quants';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { LOT_RELOCATED_REASON } from 'src/stock/utils/plan-lot-location.util';
import { groupLotMoves } from 'src/stock/utils/plan-lot-relocation-batch.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ClaimProgress } from 'src/shared/claims/types/claim-progress.type';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type LotBatchOutcome } from 'src/stock/lot/types/lot-batch-outcome.type';
import { type LotBatchPointer } from 'src/stock/lot/types/lot-batch-pointer.type';
import { type LotRelocationRequest } from 'src/stock/lot/types/lot-relocation-request.type';
import { type RecomputeLotOptions } from 'src/stock/lot/types/recompute-lot-options.type';
import { type RelocateLotPlan } from 'src/stock/lot/types/relocate-lot-plan.type';
import { type MoveQuantsOptions } from 'src/stock/quant/types/move-quants-options.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';
import { type LotMoveGroup } from 'src/stock/utils/types/lot-move-group.type';

// The step a lot's own claim keeps its plan under; a lot moved by a batch keeps a pointer to the batch there.
export const LOT_PLAN_STEP = 'relocateLot:plan';

const BATCH_ACTION = 'relocateLotBatch';
const BATCH_PLAN_STEP = `${BATCH_ACTION}:plan`;

type BatchPlan = {
  lotIds: string[];
  movedLotIds: string[];
  groups: LotMoveGroup[];
  refusals: { lotId: string; reason: string; values: TranslationValues }[];
};

type RelocateLotBatchStore = Pick<ReturnType<typeof makeClaims>, 'withClaim' | 'openJournal' | 'takeClaims' | 'releaseClaims' | 'findClaims'> & {
  newBatchId: () => string;
  planLotRelocations: (requests: LotRelocationRequest[]) => Promise<Map<string, RelocateLotPlan>>;
  readQuants: (ids: string[]) => Promise<QuantRow[]>;
  moveQuants: (quants: QuantRow[], destinationId: string | null, reason: string | null, options: MoveQuantsOptions) => Promise<unknown>;
  recomputeLot: (lotIds: string[], options?: RecomputeLotOptions) => Promise<void>;
};

const lotKey = (lotId: string) => claimKey('relocateLot', lotId);

// Stored on each lot's claim from the start. It counts as past the commit point, so a failed resume of the lot
// keeps the claim until the batch is finished.
const memberProgress = (batchId: string): ClaimProgress => {
  const pointer: LotBatchPointer = { kind: 'batch', batchId };

  return { steps: { [LOT_PLAN_STEP]: { plan: pointer, done: true } }, committed: true };
};

const pointsAtBatch = (row: ClaimRow, batchId: string) => {
  const plan = row.progress?.steps[LOT_PLAN_STEP]?.plan as Partial<LotBatchPointer> | undefined;

  return plan?.kind === 'batch' && plan.batchId === batchId;
};

const toBatchPlan = (lotIds: string[], plans: Map<string, RelocateLotPlan>): BatchPlan => {
  const moving = lotIds.flatMap((lotId) => {
    const plan = plans.get(lotId);

    return plan?.kind === 'move' ? [{ lotId, ...plan }] : [];
  });

  return {
    lotIds,
    movedLotIds: moving.map((lot) => lot.lotId),
    groups: groupLotMoves(moving),
    refusals: lotIds.flatMap((lotId) => {
      const plan = plans.get(lotId);

      return plan?.kind === 'refuse' ? [{ lotId, reason: plan.reason, values: plan.values }] : [];
    }),
  };
};

// The lots of one save move in one claimed, journaled run: one move of many rows per destination, then each lot
// shows where its stock went. A lot another run holds is answered at once; refusals are decided before the commit
// point and do not stop the other lots.
export const makeRelocateLotBatch = (store: RelocateLotBatchStore) => {
  // A lot run that took a stale lot claim over while this batch was still being finished holds it under its own run
  // id; the claim still points at this batch, so it is freed with the others whichever run holds it.
  const releaseLots = async (batchId: string, lotIds: string[]) => {
    const members = (await store.findClaims(lotIds.map(lotKey))).filter((row) => pointsAtBatch(row, batchId));

    for (const [runId, rows] of groupBy(members, (row) => row.runId)) {
      await store.releaseClaims(
        rows.map((row) => row.key),
        runId,
      );
    }
  };

  // A resumed run replays the moves its stored plan chose; the rows read here only matter to a first run.
  const runMoves = async (plan: BatchPlan, journal: ClaimJournal) => {
    const rows = new Map((await store.readQuants(plan.groups.flatMap((group) => group.quantIds))).map((row) => [row.id, row]));

    for (const [index, group] of plan.groups.entries()) {
      await store.moveQuants(
        group.quantIds.flatMap((id) => rows.get(id) ?? []),
        group.toLocationId,
        LOT_RELOCATED_REASON,
        { unpack: group.unpack, journal, stepPrefix: `${BATCH_ACTION}:move:${index}` },
      );
    }
  };

  const relocateLotBatch = async (requests: LotRelocationRequest[]): Promise<Map<string, LotBatchOutcome>> => {
    const batchId = store.newBatchId();
    const key = claimKey(BATCH_ACTION, batchId);
    const claimed = await store.withClaim(key, async (runId) => {
      const lots = await store.takeClaims(requests.map((request) => lotKey(request.lotId)), runId, memberProgress(batchId));
      const takenKeys = new Set(lots.taken);
      const taken = requests.filter((request) => takenKeys.has(lotKey(request.lotId)));
      let committed = false;
      let plan: BatchPlan;

      try {
        const journal = await store.openJournal(key, runId);

        plan = await journal.step<BatchPlan>(
          BATCH_PLAN_STEP,
          async () => toBatchPlan(taken.map((request) => request.lotId), await store.planLotRelocations(taken)),
          async () => {},
        );
        if (plan.groups.length > 0) {
          await journal.commit();
          committed = true;
          await runMoves(plan, journal);
          await store.recomputeLot(plan.movedLotIds);
        }
      } catch (error) {
        // Before the commit point nothing was written: the lots are free again. A failed release leaves the claims
        // to go stale, and the run's own error is the one reported.
        if (!committed) {
          await releaseLots(batchId, taken.map((request) => request.lotId)).catch(() => undefined);
        }
        throw error;
      }
      await releaseLots(batchId, plan.lotIds);

      return { plan, held: lots.held, stale: lots.stale };
    });

    if (claimed.kind === 'held') {
      throw new Error(`The lot batch ${batchId} is already running.`);
    }
    const { plan, held, stale } = claimed.result;
    const refusals = new Map(plan.refusals.map((refusal) => [refusal.lotId, refusal]));

    return new Map(
      requests.map(({ lotId }): [string, LotBatchOutcome] => {
        const refusal = refusals.get(lotId);

        if (held.includes(lotKey(lotId))) {
          return [lotId, { kind: 'held' }];
        }
        if (stale.includes(lotKey(lotId))) {
          return [lotId, { kind: 'stale' }];
        }
        return [lotId, refusal === undefined ? { kind: 'done' } : { kind: 'refused', reason: refusal.reason, values: refusal.values }];
      }),
    );
  };

  // A batch that passed its commit point is finished from its stored plan; one that did not is freed. Either way its
  // lots, which show the edit, then show where their stock is. A batch that stored no plan yet leaves its lots'
  // claims to their own resume, which finds the batch gone.
  const resumeRelocateLotBatch = async (batchId: string): Promise<'done' | 'held'> => {
    const key = claimKey(BATCH_ACTION, batchId);
    const claimed = await store.withClaim(key, async (runId) => {
      const journal = await store.openJournal(key, runId);

      if (!journal.resumed) {
        return;
      }
      const plan = await journal.step<BatchPlan | null>(BATCH_PLAN_STEP, async () => null, async () => {});

      if (plan === null) {
        return;
      }
      const moved = new Set(journal.committed ? plan.movedLotIds : []);

      if (journal.committed) {
        await runMoves(plan, journal);
        await store.recomputeLot(plan.movedLotIds);
      }
      // A lot the stopped run refused, or did not get to move, still shows the edit.
      await store.recomputeLot(
        plan.lotIds.filter((lotId) => !moved.has(lotId)),
        { keepWhenEmpty: true },
      );
      await releaseLots(batchId, plan.lotIds);
    });

    return claimed.kind;
  };

  return { relocateLotBatch, resumeRelocateLotBatch };
};

export const { relocateLotBatch, resumeRelocateLotBatch } = makeRelocateLotBatch({
  withClaim,
  openJournal,
  takeClaims,
  releaseClaims,
  findClaims,
  newBatchId: () => crypto.randomUUID(),
  planLotRelocations,
  readQuants: (ids) => stockQuants.find<QuantRow>({ id: { in: ids } }, QUANT_ROW),
  moveQuants,
  recomputeLot,
});
