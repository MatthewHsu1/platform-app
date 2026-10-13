import {
  CLAIM_HELD_MESSAGE,
  claimKey,
  openJournal,
  releaseClaims,
  settleOwnedClaim,
  takeClaims,
  withClaim,
} from 'src/shared/claims/claim';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { assignBatchResponsible } from 'src/stock-picking-batch/assign-batch-responsible';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { validatingBatchIds } from 'src/stock-picking-batch/validating-batches';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type MergeBatch } from 'src/stock-picking-batch/types/merge-batch.type';
import { type MergeBatchesPort } from 'src/stock-picking-batch/types/merge-batches-port.type';
import { mergeIncompatibilities, planBatchMerge } from 'src/stock-picking-batch/utils/plan-batch-buttons.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { StockUserError } from 'src/stock/stock-errors';

type MergeRun =
  | { kind: 'refuse'; message: string; values: TranslationValues }
  | {
      kind: 'merge';
      targetId: string;
      otherIds: string[];
      values: { responsibleId: string | null; description: string | null; scheduledDate: string | null };
      // The first run's id: notes a rerun writes keep their ids, and a resume frees the other batches' claims.
      saveKey: string;
      locale: string;
    };

type MergePlan = Extract<MergeRun, { kind: 'merge' }>;

const MERGE_ACTION = 'batchMerge';
const PLAN_STEP = 'merge:plan';

const mergeKey = (batchId: string) => claimKey(MERGE_ACTION, batchId);

export const makeMergeBatches = (port: MergeBatchesPort) => {
  const planMerge = async (batchIds: string[], runId: string): Promise<MergeRun> => {
    const rows = await port.readBatches(batchIds);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const batches = batchIds.flatMap((id) => byId.get(id) ?? []);

    if (batches.length !== batchIds.length) {
      throw new StockUserError(BATCH_MESSAGES.notFound);
    }
    const plan = planBatchMerge(batches);

    if (plan.kind === 'refuse') {
      return { kind: 'refuse', message: BATCH_MESSAGES[plan.message], values: {} };
    }
    const members = (await port.readMembers(batchIds)).map((member) => ({ ...member, name: member.name ?? '' }));
    const target = batches[0];
    const targetName = byId.get(target.id)?.name ?? '';
    const refused = mergeIncompatibilities({
      target: { name: targetName, state: target.state, pickingTypeId: target.pickingTypeId },
      own: members.filter((member) => member.batchId === target.id),
      moved: plan.otherIds.flatMap((otherId) => members.filter((member) => member.batchId === otherId)),
    });

    if (refused.length > 0) {
      return { kind: 'refuse', message: BATCH_MESSAGES.incompatible, values: { batch: targetName, transfers: refused.join(', ') } };
    }

    return { ...plan, saveKey: runId, locale: await port.readLocale() };
  };

  // Each step reads again what it moves, so a rerun after a stop finds the work
  // done so far. A kept batch deleted meanwhile leaves nothing to merge into.
  const finishMerge = async (plan: MergePlan, journal: ClaimJournal) => {
    if ((await port.findBatch(plan.targetId)) === undefined) {
      return;
    }
    await journal.step('merge:transfers', async () => null, () => port.moveTransfers(plan.otherIds, plan.targetId));
    await journal.step('merge:values', async () => null, () => port.writeValues(plan.targetId, plan.values));
    await journal.step(
      'merge:responsible',
      async () => null,
      async () => {
        const target = await port.findBatch(plan.targetId);

        if (target !== undefined) {
          await port.assignResponsible(
            { id: plan.targetId, name: target.name ?? '', responsibleId: plan.values.responsibleId },
            { saveKey: plan.saveKey, locale: plan.locale },
          );
        }
      },
    );
    await journal.step('merge:delete', async () => null, () => port.destroyBatches(plan.otherIds));
    await port.recomputeBatch(plan.targetId);
  };

  // The kept batch's claim is the run's; every other batch is claimed too, so
  // a merge of the same batches in another order is refused instead of
  // emptying the batch this one keeps.
  const runFresh = async (batchIds: string[], runId: string): Promise<MergeRun | { kind: 'held' }> => {
    const memberKeys = batchIds.slice(1).map(mergeKey);
    const members = await port.claims.takeClaims(memberKeys, runId, { steps: {}, owner: mergeKey(batchIds[0]) });

    if (members.held.length > 0 || members.stale.length > 0) {
      await port.claims.releaseClaims(members.taken, runId);
      return { kind: 'held' };
    }
    let committed = false;

    try {
      const journal = await port.claims.openJournal(mergeKey(batchIds[0]), runId);
      const plan = await journal.step<MergeRun>(PLAN_STEP, () => planMerge(batchIds, runId), async () => {});

      if (plan.kind === 'merge') {
        await journal.commit();
        committed = true;
        await finishMerge(plan, journal);
      }
      await port.claims.releaseClaims(members.taken, runId);

      return plan;
    } catch (error) {
      // Before the commit point nothing was written: the other batches are free
      // again. After it their claims stay until the resume finishes the merge.
      if (!committed) {
        await port.claims.releaseClaims(members.taken, runId).catch(() => undefined);
      }
      throw error;
    }
  };

  // Answers whether a stored merge was finished.
  const resumeKey = async (key: string) => {
    const outcome = await port.claims.withClaim(key, async (runId) => {
      const journal = await port.claims.openJournal(key, runId);

      if (!journal.committed) {
        return false;
      }
      const plan = await journal.step<MergeRun | null>(PLAN_STEP, async () => null, async () => {});

      if (plan?.kind !== 'merge') {
        return false;
      }
      await finishMerge(plan, journal);
      await port.claims.releaseClaims(plan.otherIds.map(mergeKey), plan.saveKey);
      return true;
    });

    return outcome.kind === 'done' && outcome.result;
  };

  // Another batch's claim of a stopped merge is settled by finishing that merge
  // first; while that merge still goes, the batch stays held.
  const settle = (key: string) =>
    port.claims.settleOwnedClaim(key, async (ownerKey) => {
      await resumeKey(ownerKey);
    });

  // Merges the selected batches into the first one; returns its name.
  const mergeBatches = async (batchIds: string[]) => {
    if (batchIds.length < 2) {
      throw new StockUserError(BATCH_MESSAGES.mergeFew);
    }
    // A batch being validated is neither kept nor emptied until its Validate ends.
    if ((await port.validatingBatchIds(batchIds)).length > 0) {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    // A kept batch still held for a stopped merge, as another batch of it or as
    // the batch it kept: that merge is finished, not this one.
    if ((await settle(mergeKey(batchIds[0]))) !== 'none' || (await resumeKey(mergeKey(batchIds[0])))) {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    const outcome = await port.claims.withClaim(mergeKey(batchIds[0]), (runId) => runFresh(batchIds, runId));

    if (outcome.kind === 'held' || outcome.result.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.result.kind === 'refuse') {
      throw new StockUserError(outcome.result.message, outcome.result.values);
    }

    return (await port.findBatch(batchIds[0]))?.name ?? '';
  };

  // The daily job (or a later click) finishes a merge that passed its commit
  // point from its stored plan, then frees the other batches. A claim with no
  // stored merge (one of the other batches, or a run stopped before its first
  // write) is just freed.
  const resumeBatchMerge = async (batchId: string) => {
    if ((await settle(mergeKey(batchId))) === 'running') {
      return;
    }
    await resumeKey(mergeKey(batchId));
  };

  return { mergeBatches, resumeBatchMerge };
};

export const { mergeBatches, resumeBatchMerge } = makeMergeBatches({
  claims: { withClaim, openJournal, takeClaims, releaseClaims, settleOwnedClaim },
  readBatches: (batchIds) =>
    stockPickingBatches.find<MergeBatch & { name: string | null }>(
      { id: { in: batchIds } },
      'id name state isWave pickingTypeId scheduledDate responsibleId description',
    ),
  readMembers: (batchIds) =>
    stockPickings.find<{ id: string; name: string | null; state: string; pickingTypeId: string | null; batchId: string }>(
      { batchId: { in: batchIds } },
      'id name state pickingTypeId batchId',
    ),
  findBatch: async (batchId) => (await stockPickingBatches.find<{ name: string | null }>({ id: { eq: batchId } }, 'name'))[0],
  readLocale: readUserLocale,
  validatingBatchIds,
  moveTransfers: async (fromBatchIds, toBatchId) => {
    const moving = await stockPickings.find<{ id: string }>({ batchId: { in: fromBatchIds } }, 'id');

    await stockPickings.updateMany(
      moving.map((picking) => picking.id),
      { batchId: toBatchId },
    );
  },
  // A filter update: a batch deleted meanwhile is skipped, not an error.
  writeValues: (batchId, values) => stockPickingBatches.updateMany([batchId], values),
  assignResponsible: async (batch, options) => {
    await assignBatchResponsible(batch, options);
  },
  destroyBatches: async (batchIds) => {
    await stockPickingBatches.destroyMany(batchIds);
  },
  recomputeBatch: (batchId) => recomputeBatchState([batchId]),
});
