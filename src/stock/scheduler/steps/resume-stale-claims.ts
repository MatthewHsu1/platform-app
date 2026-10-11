import { CLAIM_STALE_MINUTES, claimKey, findStaleClaims } from 'src/shared/claims/claim';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { resumeRelocateLot } from 'src/stock/lot/relocate-lot';
import { resumeRelocateLotBatch } from 'src/stock/lot/relocate-lot-batch';
import { resumeRevert } from 'src/stock/move-line/actions/revert-inventory';
import { releaseStaleClaim, resumeOrderClaim, resumeOrderRun } from 'src/stock/orderpoint/orderpoint-claims';
import { resumeRelocatePackage } from 'src/stock/package/relocate-package';
import { resumeUnpack } from 'src/stock/package/unpack-package';
import { resumeConfirm } from 'src/stock/picking/actions/confirm-pickings';
import { resumeReturn } from 'src/stock/picking/actions/return-picking';
import { resumeSplit } from 'src/stock/picking/actions/split-picking';
import { resumeValidate } from 'src/stock/picking/actions/validate-pickings';
import { resumeProcurementClaim } from 'src/stock/procurement/claimed-procurements';
import { resumeCount } from 'src/stock/quant/actions/apply-inventory';
import { resumeRelocate } from 'src/stock/quant/actions/relocate-quants';
import { resumeScrap } from 'src/stock/scrap/actions/validate-scrap';
import { resumeBatchMerge } from 'src/stock-picking-batch/actions/merge-batches';
import { resumeBatchValidate } from 'src/stock-picking-batch/validate-batch';
import { resumeAddToWave } from 'src/stock-picking-batch/add-to-wave';
import { planStaleClaimResumes } from 'src/stock/utils/plan-stale-claim-resumes.util';
import { resumeReconcile } from 'src/stock/warehouse/reconcile-warehouse-claimed';

// One entry per claim action a flow takes; the task that adds a claim adds its entry here. Each takes the
// stale claim over, finishes a run that passed its commit point from its stored plan, and frees one that did not.
export const STALE_CLAIM_RESUMERS: Record<string, (recordId: string) => Promise<void>> = {
  confirm: resumeConfirm,
  validate: resumeValidate,
  return: resumeReturn,
  scrap: resumeScrap,
  count: resumeCount,
  relocate: resumeRelocate,
  split: resumeSplit,
  revert: resumeRevert,
  reconcile: resumeReconcile,
  relocateLot: resumeRelocateLot,
  relocateLotBatch: async (batchId) => {
    await resumeRelocateLotBatch(batchId);
  },
  relocatePackage: resumeRelocatePackage,
  unpack: resumeUnpack,
  order: resumeOrderClaim,
  orderFinish: async (runId) => {
    await resumeOrderRun(runId);
  },
  // Through the order run: a button order's procurement claim is resumed
  // under its finish claim, never on its own.
  procurement: async (runId) => {
    await resumeOrderRun(runId);
  },
  // A Replenish stopped after its first write is finished from its stored plan.
  replenish: async (variantId) => {
    await resumeProcurementClaim(claimKey('replenish', variantId));
  },
  // Nothing to finish: the next refresh finds what a stopped one made.
  replenishment: (recordId) => releaseStaleClaim(claimKey('replenishment', recordId)),
  // Nothing to finish: what a stopped daily run ordered is finished under its
  // own rule and procurement claims, which carry its run id.
  scheduler: (recordId) => releaseStaleClaim(claimKey('scheduler', recordId)),
  // Nothing to finish: the claim only keeps auto batching of one operation
  // type to one run at a time, and a rerun of a save finds the batch it made.
  autoBatch: (pickingTypeId) => releaseStaleClaim(claimKey('autoBatch', pickingTypeId)),
  // Nothing to finish: the claim only keeps one pass at a time numbering a
  // batch, and it stores no plan.
  batchName: (batchId) => releaseStaleClaim(claimKey('batchName', batchId)),
  batchMerge: resumeBatchMerge,
  batchValidate: resumeBatchValidate,
  wave: resumeAddToWave,
};

export const resumeStaleClaims = async () => {
  const claims = await findStaleClaims(CLAIM_STALE_MINUTES);
  const { resume, unknown } = planStaleClaimResumes({ claims, actions: Object.keys(STALE_CLAIM_RESUMERS) });

  const errors = errorCollector();

  for (const { key, action, recordId } of resume) {
    await errors.run(key, () => STALE_CLAIM_RESUMERS[action](recordId));
  }
  // Reported, not removed: the claim keeps its record held until its action resumes it.
  for (const key of unknown) {
    await errors.run(key, () => Promise.reject(new Error('No resume step for this claim.')));
  }
  errors.throwIfAny();
};
