import { graphqlClaimStore } from 'src/shared/claims/claim-store';
import {
  CLAIM_STALE_MINUTES,
  claimKey,
  findStaleClaims,
  isStaleClaim,
  openJournal,
  releaseClaim,
  releaseClaims,
  takeClaims,
  withClaim,
} from 'src/shared/claims/claim';
import { isProcurementClaimCommitted, resumeProcurementClaim } from 'src/stock/procurement/claimed-procurements';
import { finishOrder, revertAutomatic } from 'src/stock/orderpoint/finish-order';
import { planOrderSettlement } from 'src/stock/orderpoint/utils/plan-order-settlement.util';
import { type ClaimRow } from 'src/shared/claims/types/claim-row.type';
import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';
import { type OrderSettlement } from 'src/stock/orderpoint/types/order-settlement.type';
import { type SettledOrderRun } from 'src/stock/orderpoint/types/settled-order-run.type';
import { type OrderpointClaimsDeps } from 'src/stock/orderpoint/types/orderpoint-claims-deps.type';

export const orderClaimKey = (orderpointId: string) => claimKey('order', orderpointId);

// Every procurement an ordering run makes goes under this one claim, keyed by
// the run id its rule claims carry, so a stopped run is found from them.
export const procurementClaimKey = (runId: string) => claimKey('procurement', runId);

// A button order stores here, before its first write, what it does once its
// procurements are written, so a stopped click is finished once and never
// orders the typed quantity a second time.
export const orderFinishClaimKey = (runId: string) => claimKey('orderFinish', runId);

const FINISH_STEP = 'finish';
const SETTLE_STEP = 'settle';
const CHUNK_STEP_PREFIX = 'chunk:';

// The stopped run's procurement claim is resumed under the finish claim, so
// a second resumer cannot finish or free it in between.
class ProcurementStillHeld extends Error {}

// A rule claim only keeps a second run from ordering the same rule at once;
// the writes are under the run's procurement claim.
export const makeOrderpointClaims = ({
  claims,
  findClaim,
  resumeProcurementClaim: resumeProcurement,
  isProcurementClaimCommitted: isCommitted,
  finishOrder: finish,
  revertAutomatic: revert,
}: OrderpointClaimsDeps) => {
  const findStale = async (key: string) =>
    (await claims.findStaleClaims(CLAIM_STALE_MINUTES)).find((claim) => claim.key === key);

  // For a claim whose run has no commit point: a stale one holds nothing to finish.
  const releaseStaleClaim = async (key: string) => {
    const stale = await findStale(key);

    if (stale !== undefined) {
      await claims.releaseClaim(key, stale.runId);
    }
  };

  // Committed from the start: the claim exists only once the order is about
  // to write, so a failed finish keeps it for the resume.
  const startOrderFinish = async (runId: string, plan: OrderFinishPlan) => {
    await claims.takeClaims([orderFinishClaimKey(runId)], runId, { steps: { [FINISH_STEP]: { plan, done: false } }, committed: true });
  };

  // Right before a chunk's procurement claim commits: these rules are being
  // ordered under that claim.
  const markOrderChunk = async (runId: string, orderpointIds: string[], procurementRunId: string) => {
    const journal = await claims.openJournal(orderFinishClaimKey(runId), runId);

    await journal.step(
      `${CHUNK_STEP_PREFIX}${procurementRunId}`,
      async () => orderpointIds,
      async () => {},
    );
  };

  const completeOrderFinish = async (runId: string, plan: OrderFinishPlan, revertIds: string[]) => {
    await finish(plan, revertIds);
    await claims.releaseClaim(orderFinishClaimKey(runId), runId);
  };

  // The finish claim: the plan, the chunks marked as being written, and a
  // settlement already decided by an earlier attempt.
  const readFinish = async (runId: string) => {
    const progress = (await findClaim(orderFinishClaimKey(runId)))?.progress;
    const plan = progress?.steps[FINISH_STEP]?.plan as OrderFinishPlan | undefined;

    if (plan === undefined) {
      return null;
    }
    const chunks = Object.entries(progress?.steps ?? {}).flatMap(([name, entry]) =>
      name.startsWith(CHUNK_STEP_PREFIX)
        ? [{ procurementRunId: name.slice(CHUNK_STEP_PREFIX.length), orderpointIds: entry.plan as string[] }]
        : [],
    );
    const marked = new Set(chunks.flatMap((chunk) => chunk.orderpointIds));

    return {
      plan,
      chunks,
      decided: progress?.steps[SETTLE_STEP]?.plan as OrderSettlement | undefined,
      notReachedIds: plan.orderpointIds.filter((id) => !marked.has(id)),
    };
  };

  // Decided from the procurement claim as it is before anyone resumes or
  // frees it, and stored before anything changes: a later attempt reuses the
  // decision and never reads a claim a resumer has since taken over.
  // `holderRunId`: the run that holds the finish claim now, the click itself
  // or a resume that took it over.
  const settleOnce = async (
    runId: string,
    holderRunId: string,
    settlement: OrderSettlement,
    work: (settlement: OrderSettlement) => Promise<void>,
  ) => {
    const journal = await claims.openJournal(orderFinishClaimKey(runId), holderRunId);

    await journal.step(SETTLE_STEP, async () => settlement, work);
  };

  const settlementFrom = (finish: NonNullable<Awaited<ReturnType<typeof readFinish>>>, procurement: ClaimRow | null) =>
    planOrderSettlement({
      plan: finish.plan,
      chunks: finish.chunks,
      // A finished run got past its commit point: its chunk is written.
      pendingProcurementRunId:
        procurement !== null && procurement.finishedAt === null && procurement.progress?.committed !== true
          ? procurement.runId
          : null,
    });

  const settle = async (settlement: OrderSettlement) => {
    await (settlement.finish === null ? revert(settlement.revertIds) : finish(settlement.finish, settlement.revertIds));
  };

  // A click that stopped on an error, still holding its claims. Before its
  // first write the rules are free again; once a chunk wrote, the order is
  // finished for the rules it wrote. Writes still under way, or any failure
  // here, keep every claim for the resume.
  const settleOrderRun = async (orderpointIds: string[], runId: string): Promise<SettledOrderRun> => {
    let notReachedIds: string[] = [];
    let ordered = false;

    try {
      const found = await readFinish(runId);

      if (found === null) {
        if (await isCommitted(procurementClaimKey(runId))) {
          return { kind: 'pending', notReachedIds };
        }
        await releaseOrderpointClaims(orderpointIds, runId);

        return { kind: 'nothingWritten' };
      }
      notReachedIds = found.notReachedIds;
      const procurement = await findClaim(procurementClaimKey(runId));

      if (found.decided === undefined && procurement?.progress?.committed === true) {
        return { kind: 'pending', notReachedIds };
      }
      const settlement = found.decided ?? settlementFrom(found, procurement);

      ordered = settlement.writtenIds.length > 0;
      await settleOnce(runId, runId, settlement, settle);
      await claims.releaseClaim(orderFinishClaimKey(runId), runId);
      // Once settled, a failed release only holds the rules until the resume frees them.
      await releaseOrderpointClaims(orderpointIds, runId).catch(() => undefined);

      return settlement.writtenIds.length === 0 ? { kind: 'nothingWritten' } : { kind: 'finished', writtenIds: settlement.writtenIds };
    } catch {
      return ordered ? { kind: 'pending', notReachedIds } : { kind: 'unknown' };
    }
  };

  // A stopped run's procurements, and for a button order its finish. The
  // finish claim is taken first and everything is read under it.
  const resumeOrderRun = async (runId: string): Promise<'done' | 'held'> => {
    if ((await findClaim(orderFinishClaimKey(runId))) === null) {
      return resumeProcurement(procurementClaimKey(runId));
    }
    try {
      const outcome = await claims.withClaim(orderFinishClaimKey(runId), async (finishRunId) => {
        const found = await readFinish(runId);

        // A finish row made by this take-over: the stopped run finished meanwhile.
        if (found === null) {
          return;
        }
        let settlement = found.decided;

        if (settlement === undefined) {
          const procurement = await findClaim(procurementClaimKey(runId));

          // Judged as a take-over judges it, so a run that finished but whose
          // claim was not removed never holds the order.
          if (procurement !== null && !claims.isStaleClaim(procurement)) {
            throw new ProcurementStillHeld();
          }
          settlement = settlementFrom(found, procurement);
        }
        await settleOnce(runId, finishRunId, settlement, async (decided) => {
          // A committed chunk counts as written: this resume replays it here.
          if ((await resumeProcurement(procurementClaimKey(runId))) === 'held') {
            throw new ProcurementStillHeld();
          }
          await settle(decided);
        });
      });

      return outcome.kind;
    } catch (error) {
      if (error instanceof ProcurementStillHeld) {
        return 'held';
      }
      throw error;
    }
  };

  // The run id keeps a run that took the rule over meanwhile from losing its
  // claim.
  const resumeOrderClaim = async (orderpointId: string) => {
    const key = orderClaimKey(orderpointId);
    const stale = await findStale(key);

    if (stale === undefined || (await resumeOrderRun(stale.runId)) === 'held') {
      return;
    }
    await claims.releaseClaim(key, stale.runId);
  };

  const releaseOrderpointClaims = (orderpointIds: string[], runId: string) =>
    claims.releaseClaims(orderpointIds.map(orderClaimKey), runId);

  // A rule another run holds is busy. One a stopped run holds is finished
  // first; once that frees it, this run takes it.
  const takeOrderpointClaims = async (orderpointIds: string[], runId: string) => {
    const ids = [...new Set(orderpointIds)];
    const { taken, stale } = await claims.takeClaims(ids.map(orderClaimKey), runId, { steps: {} });
    const takenKeys = new Set(taken);
    const staleKeys = new Set(stale);
    const resumed = ids.filter((candidate) => staleKeys.has(orderClaimKey(candidate)));

    for (const id of resumed) {
      await resumeOrderClaim(id);
    }
    if (resumed.length > 0) {
      for (const key of (await claims.takeClaims(resumed.map(orderClaimKey), runId, { steps: {} })).taken) {
        takenKeys.add(key);
      }
    }

    return {
      taken: ids.filter((id) => takenKeys.has(orderClaimKey(id))),
      busy: ids.filter((id) => !takenKeys.has(orderClaimKey(id))),
    };
  };

  // After its procurement claim committed, a failed run keeps its rules for
  // the resume; before it, nothing was written and the rules are free again.
  const releaseOrderpointClaimsUnlessWritten = async (orderpointIds: string[], runId: string) => {
    await settleOrderRun(orderpointIds, runId);
  };

  return {
    takeOrderpointClaims,
    releaseOrderpointClaims,
    releaseOrderpointClaimsUnlessWritten,
    resumeOrderClaim,
    resumeOrderRun,
    releaseStaleClaim,
    startOrderFinish,
    markOrderChunk,
    completeOrderFinish,
    settleOrderRun,
  };
};

export const {
  takeOrderpointClaims,
  releaseOrderpointClaims,
  releaseOrderpointClaimsUnlessWritten,
  resumeOrderClaim,
  resumeOrderRun,
  releaseStaleClaim,
  startOrderFinish,
  markOrderChunk,
  completeOrderFinish,
  settleOrderRun,
} = makeOrderpointClaims({
  claims: { takeClaims, releaseClaim, releaseClaims, findStaleClaims, withClaim, openJournal, isStaleClaim },
  findClaim: graphqlClaimStore.findByKey,
  resumeProcurementClaim,
  isProcurementClaimCommitted,
  finishOrder,
  revertAutomatic,
});
